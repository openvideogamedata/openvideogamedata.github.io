import './About.css'

export default function About() {
  return (
    <div className="static-page">
      <section className="static-page-header">
        <div className="container">
          <h1 className="page-title">About OpenVGD</h1>
          <p className="page-subtitle">A place to discover and compare video game lists.</p>
        </div>
      </section>

      <div className="container static-page-body">
        <div className="static-content">
          <p>
            Open Video Game Data is a project for collecting and comparing ranked video game lists.
            The site brings lists from critics, publications, and players into one place so people
            can discover which games appear most often across different opinions and categories.
          </p>
          <p>
            The project currently organizes 82 list categories and 558 collected source lists,
            covering at least 1,940 different games. These lists include year-based categories such
            as Best Games of 1995, genre categories such as Best Fighting Games of All Time,
            platform categories, and themed categories such as Best Indie Games of All Time.
          </p>
          <p>
            Each category combines several ranked lists to create a broader view of what different
            people and sources consider important. The goal is not to declare one final truth, but
            to make the comparison easier and more transparent.
          </p>
          <p>
            Visitors can search for games, explore category rankings, open the original source
            lists, see details about each game, and browse a video game history timeline. Logged-in
            users can also create their own lists, track the games they have played or want to play,
            compare progress with friends, earn badges, and receive notifications.
          </p>
          <p>
            Open Video Game Data is maintained by André N. Darcie and Diego Penha as a hobby project,
            with the goal of making video game list data easier to read, compare, and reuse.
          </p>
        </div>
      </div>
    </div>
  )
}
