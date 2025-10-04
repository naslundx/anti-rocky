resource "google_cloudbuild_trigger" "api" {
  name = "docker-build-trigger"

  github {
    owner = "naslundx"
    name  = "anti-rocky"
    push {
      branch = "main"
    }
  }

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "europe-west1-docker.pkg.dev/${var.gcp_project}/${google_artifact_registry_repository.default.name}/api:latest",
        "api"
      ]
    }

    images = [
      "europe-west1-docker.pkg.dev/${var.gcp_project}/${google_artifact_registry_repository.default.name}/api:latest"
    ]
  }
}

resource "google_cloud_run_v2_service" "api" {
  depends_on          = [google_cloudbuild_trigger.api]
  name                = "api"
  location            = var.gcp_region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.gcp_project}/api:latest"
    }
  }
}

resource "google_cloud_run_service" "api" {
  depends_on = [google_cloudbuild_trigger.api]
  name       = var.gcp_project
  location   = var.gcp_region

  template {
    spec {
      containers {
        image = "api"

        # Optional: memory & CPU
        resources {
          limits = {
            memory = "256Mi"
            cpu    = "1"
          }
        }
      }

      service_account_name = google_service_account.compute.email
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_v2_service_iam_binding" "api_public_access" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}