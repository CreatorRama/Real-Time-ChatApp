// types/auth.ts
export interface User {
  _id?: string;
  username: string;
  email: string;
  password: string;
  messages?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthFormData {
  username?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  submit?: string;
}