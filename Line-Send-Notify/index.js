module.exports = function (context, req) {
  
  let axios = require('axios');
  let querystring = require('querystring');
  let mongoose = require('mongoose');
  
  const line_notify_send_url = 'https://notify-api.line.me/api/notify';
  
  // 資料庫有查到要傳送的使用者資料
  // POST：req.body.name或req.query.name
  // GET: req.query.name
  if (context.bindings.inputDocument.length > 0) {
    
    const ObjectId = mongoose.mongo.ObjectId();

    // 取得使用者的Notify Token
    let notify_token = context.bindings.inputDocument[0].token.notify_token;
    let notify_username = context.bindings.inputDocument[0].name;
    let notify_header = { headers: {'Authorization': `Bearer ${notify_token}`} };

    let notify_message = {};

    switch (req.method) {
      case 'POST':
      case 'GET':
        // 檢查必要參數
        if (req.query.message) {
          notify_message.message = req.query.message;
        } else {
          context.res = {status: 400, body:'message 為必要參數，請重新檢查你的設定'};
          context.done();
          return;
        }
        // 檢查非必要選項參數
        if(req.query.packageid) {
          notify_message['stickerPackageId'] = req.query.packageid;
        }
        if(req.query.stickerid) {
          notify_message['stickerId'] = req.query.stickerid;
        }
        if(req.query.imagefile) {
          notify_message['imageFile'] = req.query.imagefile;
        }
        if(req.query.imagefullsize) {
          notify_message['imageFullsize'] = req.query.imagefullsize;
        }
        if(req.query.imagethumbnail) {
          notify_message['imageThumbnail'] = req.query.imagethumbnail;
        }
        
        break;

      default:
          context.res = {status: 405, body:'用來存取的 HTTP 動詞不受允許。僅接收GET與POST'};
          context.done();
          return;
        break;

    }

    // 傳送訊息到LINE Notify Service
    axios.post(line_notify_send_url, querystring.stringify(notify_message), notify_header)
    .then((response) => {
        
        context.log('Response from LINE: ', response.data);
        
        // 附加id,準備存檔到資料庫
        notify_message._id = ObjectId;

        if (req.query.username) {
          notify_message.username = req.query.username;
        }

        // 取得發送的IP
        notify_message.host = req.headers['x-forwarded-for'].split(':')[0];

        // 存檔到資料庫
        context.bindings.outputDocument = JSON.stringify(notify_message);
        
        context.res = { body: 'Sent notify message OK' };
        context.done();
    })
    .catch((error) => {
      context.log('Send nofity message error: ', error);
      context.res = { status: 400, body: error };
      context.done();
    });
  } else {
      context.res = { status:200, body: `找不到你所要傳送的對象,可能是名稱有誤或該對象尚未登錄` }
      context.done();
  }
};