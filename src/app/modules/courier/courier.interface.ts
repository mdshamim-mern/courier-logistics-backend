export interface ICourierCreate {
  name: string;
  email: string;
  password?: string;
  contactNumber: string;
  vehicleType?: string;
  vehicleNumber?: string;
  currentHubId?: string;
}

export interface ICourierUpdate {
  vehicleType?: string;
  vehicleNumber?: string;
  isAvailable?: boolean;
  currentHubId?: string;
}

export interface ICourierFilterRequest {
  isAvailable?: string | boolean;
  searchTerm?: string;
}