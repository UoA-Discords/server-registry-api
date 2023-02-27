import { ServerModel } from '../models/ServerModel';
import { UserModel } from '../models/UserModel';
import { AuthService } from '../services/AuthService';
import { ServerService } from '../services/ServerService';
import { UserService } from '../services/UserService';
import { Config } from '../types/Config';
import { AppServices } from '../types/Services';

export function loadServices(config: Config, userModel: UserModel, serverModel: ServerModel): AppServices {
    const userService = new UserService(userModel, config);
    const authService = new AuthService(config, userService);
    const serverService = new ServerService(serverModel, config, userService);

    return { authService, serverService, userService };
}
