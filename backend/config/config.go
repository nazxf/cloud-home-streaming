package config

const (
	VideoDir  = "./videos"
	Port      = ":8080"
	JWTSecret = "my-super-secret-key-2024"
	DBPath    = "./streamflix.db"
)

var ValidCredentials = map[string]string{
	"admin": "admin123",
	"user":  "password",
}
