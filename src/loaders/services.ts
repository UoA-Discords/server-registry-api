import { UserModel } from '../models/UserModel';
import { AuthService } from '../services/AuthService';
import { ServerService } from '../services/ServerService';
import { UserService } from '../services/UserService';
import { Config } from '../types/Config';
import { AppServices } from '../types/Services/AppServices';

export function loadServices(config: Config, userModel: UserModel): AppServices {
    const userService = new UserService(userModel);
    const authService = new AuthService(config, userService);
    const serverService = new ServerService();

    return { userService, authService, serverService };
}
