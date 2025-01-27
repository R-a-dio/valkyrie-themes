package themes

import (
	"context"
	"html/template"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	radio "github.com/R-a-dio/valkyrie"
	"github.com/R-a-dio/valkyrie/config"
	"github.com/R-a-dio/valkyrie/templates"
	"github.com/R-a-dio/valkyrie/templates/functions"
	"github.com/R-a-dio/valkyrie/util"
	v1 "github.com/R-a-dio/valkyrie/website/api/v1"
	"github.com/R-a-dio/valkyrie/website/public"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var publicInputs = []templates.TemplateSelectable{
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
	cfg := config.TestConfig()
	status := util.NewStaticValue(radio.Status{})

	tmpl, err := templates.FromDirectory(".", functions.NewStatefulFunctions(cfg, status))
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()
	req := httptest.NewRequest("GET", "/", nil)

	for _, theme := range tmpl.ThemeNames() {
		if templates.IsAdminTheme(theme) {
			continue
		}
		req = req.WithContext(templates.SetTheme(req.Context(), theme, true))
		t.Run(string(theme), func(t *testing.T) {
			for _, in := range publicInputs {
				t.Run(in.TemplateBundle()+"/"+in.TemplateName(), func(t *testing.T) {
					err := exec.Execute(io.Discard, req, in)
					assert.NoError(t, err)
				})
			}
		})
	}
}

func TestPublicCSRFTokenInput(t *testing.T) {
	cfg := config.TestConfig()
	status := util.NewStaticValue(radio.Status{})

	tmpl, err := templates.FromDirectory(".", functions.NewStatefulFunctions(cfg, status))
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()

	runCSRFTokenTest(t, tmpl.ThemeNames(), exec, publicInputs)
}

const csrfTokenInput = "CSRFTokenInput"

func runCSRFTokenTest(t *testing.T, themes []radio.ThemeName, exec templates.Executor, inputs []templates.TemplateSelectable) {
	t.SkipNow() // TODO: fix this test
	var toTest []func(template.HTML) templates.TemplateSelectable

	for _, in := range inputs {
		rt := reflect.TypeOf(in)
		if rt.Kind() == reflect.Pointer {
			rt = rt.Elem()
		}
		if rt.Kind() != reflect.Struct {
			continue
		}
		field, ok := rt.FieldByNameFunc(func(s string) bool {
			return s == csrfTokenInput
		})
		if !ok {
			continue
		}
		if field.Type != reflect.TypeFor[template.HTML]() {
			continue
		}

		create := func(data template.HTML) templates.TemplateSelectable {
			v := reflect.New(rt).Elem()
			vv := v
			if v.Kind() == reflect.Pointer {
				vv = v.Elem()
			}
			vv.FieldByName(csrfTokenInput).Set(reflect.ValueOf(data))
			return v.Interface().(templates.TemplateSelectable)
		}

		toTest = append(toTest, create)
	}

	// start the actual testing
	for _, theme := range themes {
		ctx := context.Background()
		ctx = templates.SetTheme(ctx, theme, true)

		for _, fn := range toTest {
			req := httptest.NewRequestWithContext(ctx, http.MethodGet, "/", nil)
			t.Run(string(theme), func(t *testing.T) {
				data := template.HTML("<input>CSRFTOKENINPUT-CSRFTOKENINPUT-CSRFTOKENINPUT-CSRFTOKENINPUT-CSRFTOKENINPUT</input>")
				input := fn(data)

				t.Run(input.TemplateBundle()+"/"+input.TemplateName(), func(t *testing.T) {
					w := httptest.NewRecorder()
					err := exec.Execute(w, req, input)
					assert.NoError(t, err)

					res, err := io.ReadAll(w.Result().Body)
					assert.NoError(t, err)
					assert.Contains(t, string(res), data)
				})
			})
		}
	}
	return
}
