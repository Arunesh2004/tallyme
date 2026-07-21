export interface ITokenProvider {
  signToken(payload: any): Promise<string>;
  verifyToken(token: string): Promise<any>;
}
