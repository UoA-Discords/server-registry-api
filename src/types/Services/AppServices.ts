import { AuthService } from '../../services/AuthService';
import { ServerService } from '../../services/ServerService';
import { UserService } from '../../services/UserService';

export interface AppServices {
    authService: AuthService;
    userService: UserService;
    serverService: ServerService;
}
