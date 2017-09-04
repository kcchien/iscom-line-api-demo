/**
 * URL query parameters 給予name跟message兩個參數
 */
module.exports = function (context, req) {
   // 引用LINE Bot SDK
    const line = require('@line/bot-sdk');
    
    // 初始化SDK
    const client = new line.Client({
        channelAccessToken: process.env.LineMessagingAPIAccessToken
    });
    
    let message = {
        type:'text',
        text:''
    };

    // 資料庫有查到要傳送的使用者資料
    if (context.bindings.inputDocument.length > 0) {

        // 檢查必要參數
        if (req.query.message && context.bindings.inputDocument[0].profile.userId) {
            message.text = req.query.message;
        } else {
            context.res = {status: 400, body:'message 為必要參數，請重新檢查你的設定'};
            context.done();
            return;
        }

        // const ObjectId = mongoose.mongo.ObjectId();
        
        let uid = context.bindings.inputDocument[0].profile.userId;
        let username = context.bindings.inputDocument[0].name;
        
        // 傳送
        client.pushMessage(uid, message)
                .then((response) => { 
                    context.log(`Message sent with response: ${response.toString()}`);
                    context.res = { status:200, body: response.toString() };
                })
                .catch((err) => { 
                    context.log.error(`Message sent error: ${err.toString()}`);
                    context.res = { status:400, body: `Message sent error: ${err.toString()}` };
                });
    }
    context.done();
};
