package themes

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	radio "github.com/R-a-dio/valkyrie"
	"github.com/R-a-dio/valkyrie/config"
	"github.com/R-a-dio/valkyrie/templates"
	"github.com/R-a-dio/valkyrie/templates/functions"
	"github.com/R-a-dio/valkyrie/util"
	"github.com/R-a-dio/valkyrie/website/admin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var adminInputs = []templates.TemplateSelectable{
	admin.HomeInput{},
	admin.PendingInput{},
	admin.SongsInput{},
	admin.SongsForm{},
	admin.NewsInput{},
	admin.NewsInputPost{},
	admin.SelectedNewsMarkdown{Name: "body-render"},
	admin.SelectedNewsMarkdown{Name: "header-render"},
	admin.TitleNewsRender{},
	admin.ProfileInput{},
	admin.ProfileForm{},
	admin.UsersInput{},
	admin.BoothInput{},
	admin.BoothProxyStatusInput{},
	admin.BoothSetThreadInput{},
	admin.BoothStatusInput{},
	admin.BoothStopStreamerInput{},
	&admin.BoothStreamerInput{},
	admin.BoothStreamerList{},
}

func TestAdminZeroInput(t *testing.T) {
	cfg := config.TestConfig()
	status := util.NewStaticValue(radio.Status{})

	tmpl, err := templates.FromDirectory(".", functions.NewStatefulFunctions(cfg, status))
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()
	req := httptest.NewRequest("GET", "/", nil)

	for _, theme := range tmpl.ThemeNamesAdmin() {
		if !strings.HasPrefix(string(theme), templates.ADMIN_PREFIX) {
			continue
		}
		req = req.WithContext(templates.SetTheme(req.Context(), theme, true))
		t.Run(string(theme), func(t *testing.T) {
			for _, in := range adminInputs {
				t.Run(in.TemplateBundle()+"/"+in.TemplateName(), func(t *testing.T) {
					err := exec.Execute(io.Discard, req, in)
					assert.NoError(t, err)
				})
			}
		})
	}
}

func TestAdminCSRFTokenInput(t *testing.T) {
	cfg := config.TestConfig()
	status := util.NewStaticValue(radio.Status{})

	tmpl, err := templates.FromDirectory(".", functions.NewStatefulFunctions(cfg, status))
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()

	runCSRFTokenTest(t, tmpl.ThemeNamesAdmin(), exec, adminInputs)
}
