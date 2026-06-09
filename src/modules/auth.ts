import { hash } from "crypto";
import webhook from "./webhook";
import { webhookData } from "../types/types";
export default class Auth {
    public static isAuthenticated = false;
    public static botToken = "";
    
    public static genSelfMadeToken(ipaddress: string):string{
        return hash("sha512",ipaddress + this.botToken);
    };
    public static setBotToken(BotToken:string):void{
        this.botToken=BotToken
    };

    public static startTokenExpiry(expiresInMs:number, webhookData: webhookData):void{
        setTimeout(() => {
            webhook.getAuthtoken(false, webhookData);
        }, expiresInMs)
    };
}; 