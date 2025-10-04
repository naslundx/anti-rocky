resource "google_firestore_database" "default" {
  name        = "(default)"
  project     = var.gcp_project
  location_id = var.gcp_region
  type        = "FIRESTORE_NATIVE"
}