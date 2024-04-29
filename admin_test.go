package themes

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/R-a-dio/valkyrie/templates"
	"github.com/R-a-dio/valkyrie/website/admin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var adminInputs = []templates.TemplateSelectable{
	admin.HomeInput{},
	admin.PendingInput{},
	admin.SongsInput{},
	admin.SongsForm{},
}

func TestAdminZeroInput(t *testing.T) {
	tmpl, err := templates.FromDirectory(".")
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()
	req := httptest.NewRequest("GET", "/", nil)

	for _, theme := range tmpl.ThemeNames() {
		if !strings.HasPrefix(theme, templates.ADMIN_PREFIX) {
			continue
		}
		req = req.WithContext(templates.SetTheme(req.Context(), theme, true))
		t.Run(theme, func(t *testing.T) {
			for _, in := range adminInputs {
				t.Run(in.TemplateBundle(), func(t *testing.T) {
					err := exec.Execute(io.Discard, req, in)
					assert.NoError(t, err)
				})
			}
		})
	}
}
