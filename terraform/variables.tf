# GCP Vars
variable "gcp_region" {
  type        = string
  description = "GCP Region, i.e. europe-west1"
  default     = "europe-west1"
}

variable "gcp_location" {
  type        = string
  description = "GCP Location, i.e. europe-west"
  default     = "europe-west"
}

variable "gcp_project" {
  type        = string
  description = "GCP Project ID"
  default     = "anti-rocky"
}