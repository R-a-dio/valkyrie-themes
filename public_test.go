package themes

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/R-a-dio/valkyrie/templates"
	v1 "github.com/R-a-dio/valkyrie/website/api/v1"
	"github.com/R-a-dio/valkyrie/website/public"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var templateInputs = []templates.TemplateSelectable{
	public.HomeInput{},
	public.ChatInput{},
	public.LastPlayedInput{},
	public.QueueInput{},
	public.NewsInput{},
	public.SubmitInput{},
	public.SubmissionForm{},
	public.FavesInput{},
	public.ScheduleInput{},
	public.StaffInput{},
	public.SearchInput{},
	v1.NowPlaying{},
	v1.LastPlayed{},
	v1.Queue{},
	v1.SearchInput{},
	v1.Listeners(0),
}

func TestPublicZeroInput(t *testing.T) {
	tmpl, err := templates.FromDirectory(".")
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()
	req := httptest.NewRequest("GET", "/", nil)

	for _, theme := range tmpl.ThemeNames() {
		req = req.WithContext(templates.SetTheme(req.Context(), theme))
		t.Run(theme, func(t *testing.T) {
			for _, in := range templateInputs {
				t.Run(in.TemplateBundle(), func(t *testing.T) {
					err := exec.Execute(io.Discard, req, in)
					assert.NoError(t, err)
				})
			}
		})
	}
}
