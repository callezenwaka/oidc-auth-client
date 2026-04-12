package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

// ─── Config ───────────────────────────────────────────────────────────────────

var (
	authority = getEnv("AUTHORITY", "https://your-idp.com")
	audience  = getEnv("AUDIENCE", "your-client-id")
	port      = getEnv("PORT", "4000")
	jwksCache jwk.Set
)

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}

func init() {
	var err error
	jwksCache, err = jwk.Fetch(context.Background(), authority+"/.well-known/jwks.json")
	if err != nil {
		log.Fatalf("Failed to fetch JWKS: %v", err)
	}
}

// ─── Middleware ───────────────────────────────────────────────────────────────

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type contextKey string

const claimsKey contextKey = "claims"

func authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			jsonError(w, "No token provided", http.StatusUnauthorized)
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse([]byte(tokenStr),
			jwt.WithKeySet(jwksCache),
			jwt.WithIssuer(authority),
			jwt.WithAudience(audience),
		)
		if err != nil {
			jsonError(w, "Invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), claimsKey, token)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getClaims(r *http.Request) jwt.Token {
	return r.Context().Value(claimsKey).(jwt.Token)
}

func hasScope(token jwt.Token, scope string) bool {
	raw, ok := token.Get("scope")
	if !ok {
		return false
	}
	return strings.Contains(" "+raw.(string)+" ", " "+scope+" ")
}

func hasRole(token jwt.Token, role string) bool {
	raw, ok := token.Get("roles")
	if !ok {
		return false
	}
	roles, ok := raw.([]interface{})
	if !ok {
		return false
	}
	for _, r := range roles {
		if r.(string) == role {
			return true
		}
	}
	return false
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

func handlePublic(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]string{"message": "Public endpoint — no authentication required"})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	t := getClaims(r)
	data := map[string]any{"sub": t.Subject()}
	if email, ok := t.Get("email"); ok {
		data["email"] = email
	}
	if scope, ok := t.Get("scope"); ok {
		data["scope"] = scope
	}
	jsonOK(w, data)
}

func handleProtected(w http.ResponseWriter, r *http.Request) {
	t := getClaims(r)
	if !hasScope(t, "read:data") {
		jsonError(w, "Insufficient scope: read:data required", http.StatusForbidden)
		return
	}
	jsonOK(w, map[string]string{"message": "Protected data", "user": t.Subject()})
}

func handleData(w http.ResponseWriter, r *http.Request) {
	t := getClaims(r)
	if !hasScope(t, "write:data") {
		jsonError(w, "Insufficient scope: write:data required", http.StatusForbidden)
		return
	}
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	jsonOK(w, map[string]any{"message": "Data written", "body": body})
}

func handleAdmin(w http.ResponseWriter, r *http.Request) {
	t := getClaims(r)
	if !hasRole(t, "admin") {
		jsonError(w, "Insufficient role: admin required", http.StatusForbidden)
		return
	}
	jsonOK(w, map[string]string{"message": "Admin data", "user": t.Subject()})
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/public",   handlePublic)
	mux.Handle("GET /api/me",           authenticate(http.HandlerFunc(handleMe)))
	mux.Handle("GET /api/protected",    authenticate(http.HandlerFunc(handleProtected)))
	mux.Handle("POST /api/data",        authenticate(http.HandlerFunc(handleData)))
	mux.Handle("GET /api/admin",        authenticate(http.HandlerFunc(handleAdmin)))

	log.Printf("Server running on http://localhost:%s", port)
	log.Printf("Authority: %s", authority)
	log.Fatal(http.ListenAndServe(":"+port, cors(mux)))
}
