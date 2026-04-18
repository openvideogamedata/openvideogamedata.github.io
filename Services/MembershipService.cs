using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using community.Dtos.Membership;
using Microsoft.EntityFrameworkCore;

namespace community.Services;

public sealed class MembershipService
{
    private const int MonthlyPriceInCents = 1000;
    private const string Currency = "brl";

    private readonly IDbContextFactory<ApplicationDbContext> _factory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MembershipService> _logger;
    private readonly string _stripeSecretKey;
    private readonly string _stripeWebhookSecret;
    private readonly string _clientBaseUrl;

    public MembershipService(
        IDbContextFactory<ApplicationDbContext> factory,
        IHttpClientFactory httpClientFactory,
        ILogger<MembershipService> logger)
    {
        _factory = factory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _stripeSecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") ?? "sk_test_...";
        _stripeWebhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? "whsec_...";
        _clientBaseUrl = (Environment.GetEnvironmentVariable("CLIENT_BASE_URL") ?? "http://localhost:5173").TrimEnd('/');
    }

    public async Task<CreateMembershipCheckoutResponse> CreateCheckoutSession(User user)
    {
        using var context = _factory.CreateDbContext();
        var trackedUser = await context.Users.FirstOrDefaultAsync(x => x.Id == user.Id);
        if (trackedUser is null)
        {
            throw new InvalidOperationException("Usuario nao encontrado.");
        }

        if (trackedUser.IsMember)
        {
            throw new InvalidOperationException("Usuario ja e membro.");
        }

        var form = new Dictionary<string, string>
        {
            ["mode"] = "subscription",
            ["success_url"] = $"{_clientBaseUrl}/#/membership/success?session_id={{CHECKOUT_SESSION_ID}}",
            ["cancel_url"] = $"{_clientBaseUrl}/#/membership/cancel",
            ["client_reference_id"] = trackedUser.Id.ToString(CultureInfo.InvariantCulture),
            ["metadata[user_id]"] = trackedUser.Id.ToString(CultureInfo.InvariantCulture),
            ["subscription_data[metadata][user_id]"] = trackedUser.Id.ToString(CultureInfo.InvariantCulture),
            ["line_items[0][quantity]"] = "1",
            ["line_items[0][price_data][currency]"] = Currency,
            ["line_items[0][price_data][unit_amount]"] = MonthlyPriceInCents.ToString(CultureInfo.InvariantCulture),
            ["line_items[0][price_data][recurring][interval]"] = "month",
            ["line_items[0][price_data][product_data][name]"] = "Membro Open Video Game Data"
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.stripe.com/v1/checkout/sessions")
        {
            Content = new FormUrlEncodedContent(form)
        };
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _stripeSecretKey);

        using var client = _httpClientFactory.CreateClient();
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Stripe checkout session failed. Status={StatusCode} Body={Body}", response.StatusCode, body);
            throw new InvalidOperationException("Nao foi possivel criar a sessao de pagamento.");
        }

        using var json = JsonDocument.Parse(body);
        var root = json.RootElement;
        var id = root.GetProperty("id").GetString();
        var url = root.GetProperty("url").GetString();

        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(url))
        {
            throw new InvalidOperationException("Stripe nao retornou uma sessao valida.");
        }

        return new CreateMembershipCheckoutResponse(id, url);
    }

    public MembershipStatusResponse GetStatus(User user)
    {
        return new MembershipStatusResponse(
            user.IsMember,
            user.MembershipStatus,
            user.MemberSince,
            user.MemberUntil);
    }

    public async Task ProcessStripeWebhook(string payload, string? signatureHeader)
    {
        if (!SignatureIsValid(payload, signatureHeader))
        {
            throw new InvalidOperationException("Assinatura do webhook invalida.");
        }

        using var json = JsonDocument.Parse(payload);
        var root = json.RootElement;
        var eventType = ReadString(root, "type");
        if (!root.TryGetProperty("data", out var data) || !data.TryGetProperty("object", out var stripeObject))
        {
            return;
        }

        switch (eventType)
        {
            case "checkout.session.completed":
                await MarkCheckoutCompleted(stripeObject);
                break;
            case "customer.subscription.updated":
            case "customer.subscription.created":
                await UpdateFromSubscription(stripeObject);
                break;
            case "customer.subscription.deleted":
                await DisableFromSubscription(stripeObject, "canceled");
                break;
            case "invoice.paid":
                await MarkInvoicePaid(stripeObject);
                break;
            case "invoice.payment_failed":
                await MarkInvoicePaymentFailed(stripeObject);
                break;
        }
    }

    private async Task MarkCheckoutCompleted(JsonElement session)
    {
        var userId = ReadLong(session, "client_reference_id") ?? ReadMetadataUserId(session);
        if (userId is null)
        {
            return;
        }

        var paymentStatus = ReadString(session, "payment_status");
        var customerId = ReadString(session, "customer");
        var subscriptionId = ReadString(session, "subscription");

        using var context = _factory.CreateDbContext();
        var user = await context.Users.FirstOrDefaultAsync(x => x.Id == userId.Value);
        if (user is null)
        {
            return;
        }

        MarkUserAsMember(
            user,
            status: paymentStatus == "paid" ? "active" : "checkout_completed",
            customerId,
            subscriptionId,
            memberUntil: null);

        await context.SaveChangesAsync();
    }

    private async Task UpdateFromSubscription(JsonElement subscription)
    {
        var status = ReadString(subscription, "status");
        var userId = ReadMetadataUserId(subscription);
        var subscriptionId = ReadString(subscription, "id");
        var customerId = ReadString(subscription, "customer");
        var active = status is "active" or "trialing";

        using var context = _factory.CreateDbContext();
        var user = await FindMembershipUser(context, userId, subscriptionId, customerId);
        if (user is null)
        {
            return;
        }

        if (active)
        {
            MarkUserAsMember(
                user,
                status,
                customerId,
                subscriptionId,
                ReadUnixDateTime(subscription, "current_period_end"));
        }
        else
        {
            MarkUserAsNotMember(
                user,
                status,
                customerId,
                subscriptionId,
                ReadUnixDateTime(subscription, "current_period_end") ?? DateTime.UtcNow);
        }

        await context.SaveChangesAsync();
    }

    private async Task DisableFromSubscription(JsonElement subscription, string status)
    {
        var userId = ReadMetadataUserId(subscription);
        var subscriptionId = ReadString(subscription, "id");
        var customerId = ReadString(subscription, "customer");

        using var context = _factory.CreateDbContext();
        var user = await FindMembershipUser(context, userId, subscriptionId, customerId);
        if (user is null)
        {
            return;
        }

        MarkUserAsNotMember(
            user,
            status,
            customerId,
            subscriptionId,
            DateTime.UtcNow);

        await context.SaveChangesAsync();
    }

    private async Task MarkInvoicePaid(JsonElement invoice)
    {
        var userId = ReadInvoiceMetadataUserId(invoice);
        var subscriptionId = ReadString(invoice, "subscription");
        var customerId = ReadString(invoice, "customer");

        using var context = _factory.CreateDbContext();
        var user = await FindMembershipUser(context, userId, subscriptionId, customerId);
        if (user is null)
        {
            return;
        }

        MarkUserAsMember(
            user,
            status: "active",
            customerId,
            subscriptionId,
            ReadUnixDateTime(invoice, "period_end"));

        await context.SaveChangesAsync();
    }

    private async Task MarkInvoicePaymentFailed(JsonElement invoice)
    {
        var userId = ReadInvoiceMetadataUserId(invoice);
        var subscriptionId = ReadString(invoice, "subscription");
        var customerId = ReadString(invoice, "customer");

        using var context = _factory.CreateDbContext();
        var user = await FindMembershipUser(context, userId, subscriptionId, customerId);
        if (user is null)
        {
            return;
        }

        MarkUserAsNotMember(
            user,
            status: "past_due",
            customerId,
            subscriptionId,
            DateTime.UtcNow);

        await context.SaveChangesAsync();
    }

    private static void MarkUserAsMember(
        User user,
        string? status,
        string? customerId,
        string? subscriptionId,
        DateTime? memberUntil)
    {
        user.IsMember = true;
        user.MembershipStatus = string.IsNullOrWhiteSpace(status) ? "active" : status;
        user.MemberSince ??= DateTime.UtcNow;
        user.MemberUntil = memberUntil ?? user.MemberUntil;
        user.StripeCustomerId = customerId ?? user.StripeCustomerId;
        user.StripeSubscriptionId = subscriptionId ?? user.StripeSubscriptionId;
    }

    private static void MarkUserAsNotMember(
        User user,
        string? status,
        string? customerId,
        string? subscriptionId,
        DateTime memberUntil)
    {
        user.IsMember = false;
        user.MembershipStatus = string.IsNullOrWhiteSpace(status) ? "inactive" : status;
        user.MemberUntil = memberUntil;
        user.StripeCustomerId = customerId ?? user.StripeCustomerId;
        user.StripeSubscriptionId = subscriptionId ?? user.StripeSubscriptionId;
    }

    private static async Task<User?> FindMembershipUser(ApplicationDbContext context, long? userId, string? subscriptionId, string? customerId)
    {
        if (userId.HasValue)
        {
            var user = await context.Users.FirstOrDefaultAsync(x => x.Id == userId.Value);
            if (user is not null)
            {
                return user;
            }
        }

        if (!string.IsNullOrWhiteSpace(subscriptionId))
        {
            var user = await context.Users.FirstOrDefaultAsync(x => x.StripeSubscriptionId == subscriptionId);
            if (user is not null)
            {
                return user;
            }
        }

        if (!string.IsNullOrWhiteSpace(customerId))
        {
            return await context.Users.FirstOrDefaultAsync(x => x.StripeCustomerId == customerId);
        }

        return null;
    }

    private bool SignatureIsValid(string payload, string? signatureHeader)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader) || string.IsNullOrWhiteSpace(_stripeWebhookSecret))
        {
            return false;
        }

        var parts = signatureHeader.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var timestamp = parts.FirstOrDefault(x => x.StartsWith("t=", StringComparison.Ordinal))?.Substring(2);
        var signatures = parts
            .Where(x => x.StartsWith("v1=", StringComparison.Ordinal))
            .Select(x => x.Substring(3))
            .ToList();

        if (string.IsNullOrWhiteSpace(timestamp) || signatures.Count == 0)
        {
            return false;
        }

        var signedPayload = $"{timestamp}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_stripeWebhookSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();
        return signatures.Any(signature => CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature),
            Encoding.UTF8.GetBytes(expected)));
    }

    private static string? ReadString(JsonElement element, string property)
    {
        return element.TryGetProperty(property, out var value) && value.ValueKind != JsonValueKind.Null
            ? value.ToString()
            : null;
    }

    private static long? ReadLong(JsonElement element, string property)
    {
        var value = ReadString(element, property);
        return long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static long? ReadMetadataUserId(JsonElement element)
    {
        if (!element.TryGetProperty("metadata", out var metadata) || metadata.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return ReadLong(metadata, "user_id");
    }

    private static long? ReadInvoiceMetadataUserId(JsonElement invoice)
    {
        if (invoice.TryGetProperty("subscription_details", out var details))
        {
            var userId = ReadMetadataUserId(details);
            if (userId.HasValue)
            {
                return userId;
            }
        }

        return ReadMetadataUserId(invoice);
    }

    private static DateTime? ReadUnixDateTime(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Number)
        {
            return null;
        }

        return value.TryGetInt64(out var unixTime)
            ? DateTimeOffset.FromUnixTimeSeconds(unixTime).UtcDateTime
            : null;
    }
}
