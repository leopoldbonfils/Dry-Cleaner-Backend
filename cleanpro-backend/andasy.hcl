app_name = "dry-cleaner-backend"

app {
  # Basic configuration
  env = {
    NODE_ENV = "production"
  }

  # Port configuration
  port = 5000

  compute {
    cpu = 1
    memory = 512
    cpu_kind = "shared"
  }

  # Process configuration
  process {
    name = "dry-cleaner-backend"
  }
}