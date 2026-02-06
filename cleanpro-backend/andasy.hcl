app {
  name = "dry-cleaner-backend"

  env = {}

  port = 8080

  compute {
    cpu = 1
    memory = 256
    cpu_kind = "shared"
  }

  process {
    name = "dry-cleaner-backend"
  }
}
