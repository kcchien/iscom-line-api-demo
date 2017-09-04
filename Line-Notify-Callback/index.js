/**
 * 使用Line Notify 服務傳送訊息
 */
module.exports = function (context, req) {

    let axios = require('axios');
    let querystring = require('querystring');
    let mongoose = require('mongoose');
    
    const line_notify_client_id = process.env.LineNotifyClientID;
    const line_notify_client_secret = process.env.LineNotifyClientSecret;
    
    const line_notify_auth_url = 'https://notify-bot.line.me/oauth/token';
    const line_notify_send_url = 'https://notify-api.line.me/api/notify';
    const line_notify_redirect_url = process.env.LineNotifyRedirectUrlStaging || process.env.LineNotifyRedirectUrl;
    
    // id for DocumentsDB
    const ObjectId = mongoose.mongo.ObjectId();
    
    context.log('Processed a request from LINE notify API');
    
    // 從request url裡取出code跟state兩個參數
    let code = req.query.code;
    let state = req.query.state;
    // Init entity
    let entity = {};
    
    if (code) {
        // 產生要送到LINE的payload
        let form_data = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: line_notify_redirect_url,
            client_id: line_notify_client_id,
            client_secret:line_notify_client_secret
        };
        
        // 記錄名字, _id
        entity.name = state;
        entity._id = ObjectId; 
        entity.token = {};
        entity.token.notify_token = '';
        
        function filterByName(obj) {
            // if (obj.name === state ) {
            //     return true;
            // } else {
            //     return false;
            // }
            return obj.name === state ? true: false;
        };
        
        // 到資料庫濾出是否已有資料
        let exist_token = context.bindings.inputDocument.filter(filterByName);

        // 到LINE Notify Auth去換TOKEN
        axios.post(line_notify_auth_url, querystring.stringify(form_data))
        .then((response) => {
            // 拿到access_token, 再次確認access_token
            if(response.data.access_token) {
                // 這個token 就是可以直接傳訊息給使用者的token
                let notify_header = { headers: {'Authorization': `Bearer ${response.data.access_token}`} };
                
                // compose welcome message for user
                let notify_message = {
                    message: `${state} 你好，你已成功加入LINE通知功能，謝謝！`,
                    stickerPackageId: 1,
                    stickerId: 4
                };

                // 把token記錄起來
                entity.token.notify_token = response.data.access_token;
                                
                // 如果有資料，就更新現有資料, 否則新增一筆
                if (exist_token.length > 0) {
                    exist_token[0].token.notify_token = entity.token.notify_token;
                    context.bindings.outputDocument = exist_token[0];
                } else {
                    context.bindings.outputDocument = JSON.stringify(entity);
                }

                // send welcome message to user
                axios.post(line_notify_send_url,querystring.stringify(notify_message), notify_header)
                .then((response) => {
                    context.log('Send message', response.data);
                    context.res = {
                        status: 200,
                        body: `${state}你好，你已成功加入LINE通知功能, 本視窗可以關閉, 謝謝！`
                    };
                    context.done();
                });
            }
      })
      .catch(function (error) {
        context.log('error: ', error);
        context.res = {status: 400, body: error};
        context.done();
      });
    } else {
        context.done();
    }
};
