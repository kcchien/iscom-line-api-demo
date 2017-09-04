/**
 * Line Messaging Reply API Demo Code 
 */
module.exports = function (context, req) {
    // 引用LINE Bot SDK
    const line = require('@line/bot-sdk');
    
    // LINE USER ID
    const uid = 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    
    // 初始化SDK
    const client = new line.Client({
        channelAccessToken: process.env.LineMessagingAPIAccessToken
    });
    
    let message = {
        type:'text',
        text:''
    };

    if (req.body.events) {
        req.body.events.forEach((element) => {
            context.log('Event source:', element.source);
            context.log('Event message:', element.message);

            message.text = `
            Event Type: ${element.type}
            Event Reply Token: ${element.replyToken}
            Event source: ${JSON.stringify(element.source)}
            Event message: ${JSON.stringify(element.message)}
            `;

            client.pushMessage(uid, message)
            .then((response) => { 
                context.log(response);
                context.log('Message Sent!');
                context.res = { status:200, body: response.toString() };
            })
            .catch((err) => { context.log.error(err); });
        }, this);
    }
    
    context.done();
};
