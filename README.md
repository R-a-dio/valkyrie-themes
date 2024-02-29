Valkyrie Themes
===============

Repository for website themes for [valkyrie](https://github.com/r-a-dio/valkyrie)

Page to template mapping
------------------------

Mapping from URL > Template file for the public site and the input it receives.

All inputs also have access to the shared [Input](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/middleware#Input)

| URL               | File                  | Input                                                                                              |
|-------------------|-----------------------|----------------------------------------------------------------------------------------------------|
| /                 | home.tmpl             | [HomeInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#HomeInput)               |
| /queue            | queue.tmpl            | [QueueInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#QueueInput)             |
| /last-played      | lastplayed.tmpl       | [LastPlayedInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#LastPlayedInput)   |
| /news             | news.tmpl             | [NewsInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#NewsInput)               |
| /news/\<id>       | news-single.tmpl      | [NewsEntryInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#NewsEntryInput)     |
| /schedule         | schedule.tmpl         | [ScheduleInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#ScheduleInput)       |
| /search           | search.tmpl           | [SearchInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#SearchInput)           |
| /staff            | staff.tmpl            | [StaffInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#StaffInput)             |
| /submit           | submit.tmpl           | [SubmitInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#SubmitInput)           |
| /faves            | faves.tmpl            | [FavesInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#FavesInput)             |
| /irc              | chat.tmpl             | [ChatInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#ChatInput)               |

There are also special templates that are required for the API to function, those are defined in one of the above templates but executed separately:

**home.tmpl:**
>| Template      |   Input                                                                                | Description                                       |
>|---------------|----------------------------------------------------------------------------------------|---------------------------------------------------|
>| nowplaying    | [NowPlaying](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/api/v1#NowPlaying) | The currently playing song bit of the home page   |
>| lastplayed    | [LastPlayed](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/api/v1#LastPlayed) | The list of played songs                          |
>| queue         | [Queue](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/api/v1#Queue)           | The list of queued songs                          |
>| streamer      | [Streamer](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/api/v1#Streamer)     | The currently live DJ/streamer live               |
>| listeners     | [Listeners](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/api/v1#Listeners)   | The listeners amount                              |


**search.tmpl:**
>| Template     |   Input                                                                                  | Description                             |
>|--------------|------------------------------------------------------------------------------------------|-----------------------------------------|
>| search-api   | [SearchInput](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#SearchInput) | The popup when you search in the navbar |


**submit.tmpl:**
>| Template     | Input                                                                                          | Description                   |
>|--------------|------------------------------------------------------------------------------------------------|-------------------------------|
>| form_submit  | [SubmissionForm](https://pkg.go.dev/github.com/R-a-dio/valkyrie/website/public#SubmissionForm) | The form used to submit songs |