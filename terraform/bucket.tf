resource "google_storage_bucket" "code_storage" {
  name     = var.gcp_project
  location = var.gcp_region
}

resource "google_storage_bucket" "frontend" {
  name     = "www.defending.earth"
  location = var.gcp_region
}

resource "google_storage_default_object_access_control" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "READER"
  entity = "allUsers"
}