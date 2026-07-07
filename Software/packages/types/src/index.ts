import { z } from 'zod';

// ─── Device Routes ────────────────────────────────────────────────────────────

export const VerifyRequestSchema = z.object({
  deviceId: z.string().min(1),
  cardUid: z.string().min(1),
});
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const VerifyResponseSchema = z.object({
  allowed: z.boolean(),
  studentName: z.string().optional(),
  displayMessage: z.string(),
  reason: z.string().optional(),
});
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

export const ConsumeRequestSchema = z.object({
  deviceId: z.string().min(1),
  cardUid: z.string().min(1),
});
export type ConsumeRequest = z.infer<typeof ConsumeRequestSchema>;

export const SensorRequestSchema = z.object({
  deviceId: z.string().min(1),
  type: z.enum(['GAS', 'IR']),
  value: z.number(),
});
export type SensorRequest = z.infer<typeof SensorRequestSchema>;

export const HeartbeatRequestSchema = z.object({
  deviceId: z.string().min(1),
  firmwareVersion: z.string().optional(),
  uptime: z.number().optional(),
});
export type HeartbeatRequest = z.infer<typeof HeartbeatRequestSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['student', 'admin']),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ─── Admin / Dashboard ────────────────────────────────────────────────────────

export const MealSessionSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  mealType: z.string(),
  totalMeals: z.number(),
  updatedAt: z.string(),
});
export type MealSession = z.infer<typeof MealSessionSchema>;

export const UpdateMealSessionSchema = z.object({
  isActive: z.boolean().optional(),
  totalMeals: z.number().int().min(0).optional(),
});
export type UpdateMealSession = z.infer<typeof UpdateMealSessionSchema>;

export const MealStatusSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  status: z.enum(['CONSUMED', 'NOT_CONSUMED']),
  updatedAt: z.string(),
  student: z.object({
    name: z.string(),
    studentId: z.string(),
  }).optional(),
});
export type MealStatus = z.infer<typeof MealStatusSchema>;

export const LogSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  type: z.string(),
  message: z.string(),
  createdAt: z.string(),
});
export type Log = z.infer<typeof LogSchema>;

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WsLogEvent {
  type: 'log:new';
  log: Log;
}

export interface WsAlertEvent {
  type: 'alert:gas';
  deviceId: string;
  value: number;
}

export interface WsMealResetEvent {
  type: 'meal:reset';
}

export interface WsDeviceStatusEvent {
  type: 'device:status';
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE';
}

export type WsEvent = WsLogEvent | WsAlertEvent | WsMealResetEvent | WsDeviceStatusEvent;
