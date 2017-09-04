module.exports = function (context, req) {
  /**
   * 匯入需要用到的功能模組
   */
  const axios = require('axios');
  const querystring = require('querystring');
  const mongoose = require('mongoose');
  const fs = require('fs');
  const path = require('path');

  /**
   * LINE Login, Notify API 會使用到的相關URLs
   */
  const line_login_token_url = 'https://api.line.me/v2/oauth/accessToken';
  const line_user_profile_url = 'https://api.line.me/v2/profile';
  const line_notify_auth_url = 'https://notify-bot.line.me/oauth/authorize';
  
  /**
   * 需在Azure Function App setting裡設置的變數
   * 1. LineLoginClientID
   * 2. LineLoginClientSecret
   * 3. LineLoginRedirectUrl (若沒有設置，會使用目前Functions的URL)
   * //Line Notify
   * 4. LineNotifyRedirectUrl
   * 請到
   * https://business.line.me 建立LINE Login 帳號
   * https://developers.line.me 設定與取得相關的參數值
   * Cosmos DB 的連線字串，要先建立cosmos DB, 並取得Account Key
   * my_DOCUMENTDB:AccountEndpoint=https://kingsteel.documents.azure.com:443/;AccountKey={建立完cosmos DB後,會有一串Account Key};
   */
  const line_login_client_id = process.env.LineLoginClientID;
  const ine_login_client_secret = process.env.LineLoginClientSecret;
  const line_login_redirect_url = process.env.LineLoginRedirectUrl || req.originalUrl.split('?')[0];
  const line_notify_redirect_url = process.env.LineNotifyRedirectUrl;
  
  // id for DocumentsDB
  const ObjectId = mongoose.mongo.ObjectId();
  
  /**
   * 輔助使用者如何登錄的說明圖檔
   * 建議尺寸 width:478 height:800
   */
  const DescriptionImageUrl = 'https://c1.staticflickr.com/5/4240/34343273214_357cc5c983_c.jpg';
  
  context.log('Processed a request from LINE Login API');

  // 從request url裡取出code跟state兩個參數
  let code = req.query.code;
  let state = req.query.state;

  let entity = {};

  // 有傳遞code參數進來的話, 就拿code 去LINE換TOKEN回來
  if (code) {
    // 產生要送到LINE的payload
    let form_data = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: line_login_redirect_url,
        client_id: ine_login_client_id,
        client_secret:ine_login_client_secret
    };
    
    // 記錄名字, _id
    entity.name = state;
    entity._id = ObjectId;    

    // 用來找出目前使用者是否已有資料庫記錄的函數
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
     
    // 到LINE去換TOKEN
    axios.post(line_login_token_url, querystring.stringify(form_data))
    .then((response) => {
      // 拿到access_token, 再次確認access_token
      if(response.data.access_token) {
        // 把收到的token資訊記錄下來 (scope, access_token, expires_in, token_type, refresh_token)
        entity.token = response.data;

        context.log('token: ', response.data);

        // 用access token產生 Oauth 2 header
        let config = { headers: { 
          'Authorization': `Bearer ${response.data.access_token}`
        } };
        
        // 拿access_token取得LINE使用者的profile內容
        axios.get(line_user_profile_url, config).then((response) => {
          // 把user profile記錄下來 (userId, displayName, pictureUrl, statusMessage)
          entity.profile = response.data;

          // 如果有資料，就更新現有資料, 否則新增一筆
          if (exist_token.length > 0) {
            exist_token[0].token = entity.token;
            exist_token[0].profile = entity.profile;
            context.bindings.outputDocument = exist_token[0];
          } else {
            context.bindings.outputDocument = JSON.stringify(entity);
          }
      
          // 準備要轉送去Line Notify API的query string
          let query_param = querystring.stringify({
            response_type: 'code',
            client_id: process.env.LineNotifyClientID,
            redirect_uri: line_notify_redirect_url,
            scope: 'notify',
            state: state
          });
        
          // 已取得使用者的Profile
          // Render一個按鈕，讓使用者轉向到Line Notify登錄
          let hyperlink = `${line_notify_auth_url}?${query_param}`;

          context.log('Redirect to: ',hyperlink);
        
          // 讀取目前目錄下的bootstrap.min.css, 產生一個HTML頁面
          fs.readFile(path.resolve(__dirname, 'bootstrap.min.css'), 'utf8', (err, css) => {
            if (err) {
              context.log('Read CSS Error:', err);
              context.res = {status:500,body:err};
            } else {
              // 網頁內文
              var html = 
                `<div class="container">
                    <div class="row">
                        <div class="col-md-4"></div>
                        <div class="col-md-4">
                            <div align="center">
                                <h1>King Steel</h1>
                                <h3>LINE Notify 通知服務登錄</h3>
                                <a href="${hyperlink}" class="btn btn-primary btn-lg btn-block" role="button" target="_blank">點擊登錄</a>
                                <br>
                                <p class="text-center">請依下圖所示，點選<mark>透過1對1聊天接收LINE Notify的通知</mark>後，再點擊畫面最下方的<mark>同意並連動</mark>，完成登錄</p>
                                <img src="${DescriptionImageUrl}" width="479" height="800" alt="hint" class="img-responsive img-rounded img-thumbnail">
                                <p class="text-center">本服務為鉅鋼機械行政提供</p>
                                <p class="text-center">King Steel Machinery Co., Ltd.</p>
                            </div>
                        </div>
                        <div class="col-md-4"></div>
                    </div>
                </div>`;

                var body = 
                  `<html><header>
                  <meta charset="UTF-8">
                  <meta http-equiv="X-UA-Compatible" content="IE=edge">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>${css}</style>
                  </header><body>${html}</body></html>`;
              
                context.res = {
                    headers: { "Content-Type": "text/html" },
                    body: body
                };
            }
            context.done();
          });
        });
      }
    })
    .catch((error) => {
      context.log('error: ', error);
      context.res = {status: 400, body: error};
      context.done();
    });
  } else {
    context.res = {body:'Unknow request'};
    context.done();
  }
};
