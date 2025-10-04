resource "google_artifact_registry_repository" "default" {
  repository_id = var.gcp_project
  location      = var.gcp_region
  format        = "DOCKER"
}