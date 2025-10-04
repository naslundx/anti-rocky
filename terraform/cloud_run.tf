resource "google_cloud_run_v2_service" "api" {
  name                = "api"
  location            = var.gcp_region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "europe-west1-docker.pkg.dev/${var.gcp_project}/${var.gcp_project}/api:latest"
      env {
        name  = "env"
        value = "production"
      }
    }
  }
  lifecycle {
    ignore_changes = [
      template[0].containers[0].env,
      client,
      client_version
    ]
  }
}

resource "google_cloud_run_v2_service_iam_binding" "api_public_access" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}