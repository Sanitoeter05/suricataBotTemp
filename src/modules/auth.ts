import { hash } from "crypto";

export default class Auth {
    public static isAuthenticated = false;
    private static botToken = "";
    
    public static genSelfMadeToken(ipaddress: string):string{
        return hash("sha512",ipaddress + this.botToken);
    };
    public static setBotToken(BotToken:string):void{
        this.botToken=BotToken
    };
    public static startTokenExpiry(expiresInMs:number):void{};
}; 