export interface IAuthService {
  validateUser(payload: any): Promise<any>;
}
