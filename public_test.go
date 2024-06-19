package themes

import (
	"html/template"
	"io"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/R-a-dio/valkyrie/templates"
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
	v1.SearchInput{},
}

func TestPublicZeroInput(t *testing.T) {
	tmpl, err := templates.FromDirectory(".", nil)
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()
	req := httptest.NewRequest("GET", "/", nil)

	for _, theme := range tmpl.ThemeNames() {
		if strings.HasPrefix(theme, templates.ADMIN_PREFIX) {
			continue
		}
		req = req.WithContext(templates.SetTheme(req.Context(), theme, true))
		t.Run(theme, func(t *testing.T) {
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
	tmpl, err := templates.FromDirectory(".", nil)
	require.NoError(t, err)
	tmpl.Production = true

	exec := tmpl.Executor()

	runCSRFTokenTest(t, tmpl.ThemeNames(), exec, publicInputs)
}

const csrfTokenInput = "CSRFTokenInput"

func runCSRFTokenTest(t *testing.T, themes []string, exec templates.Executor, inputs []templates.TemplateSelectable) {
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
	req := httptest.NewRequest("GET", "/", nil)

	for _, theme := range themes {
		req = req.WithContext(templates.SetTheme(req.Context(), theme, true))
		for _, fn := range toTest {
			t.Run(theme, func(t *testing.T) {
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
