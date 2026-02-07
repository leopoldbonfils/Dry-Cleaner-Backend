app {
  name = "dry-cleaner-backend"
  
  env = {
    NODE_ENV = "production"
  }

  port = 5000

  compute {
    cpu = 1
    memory = 512
    cpu_kind = "shared"
  }

  process {
    name = "dry-cleaner-backend"
  }
}