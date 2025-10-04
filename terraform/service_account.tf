resource "google_service_account" "compute" {
  account_id   = "compute-account"
  display_name = "Compute Account"
}

variable "sa_compute_iam" {
  type = list(string)
  default = [
    "roles/editor",
    "roles/iam.serviceAccountUser"
  ]
}

resource "google_project_iam_member" "compute_iam" {
  depends_on = [google_service_account.compute]
  for_each = toset(var.sa_compute_iam)

  project = var.gcp_project
  role    = each.value
  member  = google_service_account.compute.member
}