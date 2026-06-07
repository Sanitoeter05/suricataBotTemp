export default class testModifier {
    public static multiplyString(str: string, times: number): string {
        let result = '';
        for (let i = 0; i < times; i++) {
            result += str + '\n';
        }
        return result;
    }
}
