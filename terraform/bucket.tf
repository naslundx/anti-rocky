resource "google_storage_bucket" "code_storage" {
  name     = var.gcp_project
  location = var.gcp_region
}