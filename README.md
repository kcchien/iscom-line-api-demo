# Introduction
本程式碼需佈署於Azure Function上，另外需要建立一個Azure Cosmos DB以儲存相關資料。<br />
開發語言為Node.js，後端使用Azure Function與Cosmos DB<br/>
整個Demo code分為3大部份
1. LINE Login API 實作
    * Line-Login-Callback
2. LINE Notify API 實作
    * Line-Notify-Callback
    * Line-Send-Notify
3. LINE Messaging API 實作 (非必需，可以不用部署此兩個Function)
    * Line-Messaging-Push
    * Line-Messaging-Reply
# 環境設置與準備
## LINE
1. 申請LINE的帳號(如果有，請略過此步驟)
2. 建立Line Login 帳號 https://business.line.me<br />
申請完成後會取得
    * Channel ID
    * Channel Secret
3. 建立Line Notify 帳號 https://notify-bot.line.me<br/>
申請完成後會取得
    * Client ID
    * Client Secret
## Azure
1. 建立Azure Cosmos DB, 建立一個資料庫，名稱為 **line-api**(均為小寫)，並且取得下列2個值
    * HOST
    * PASSWORD
2. 建立Azure Function
## 部署程式碼至Azure Function
Azure Function支援以版控系統直接部署程式碼，如git, Visual Studio Team Service等，在此假設以git作為版控<br />
先將本專案fork到你個人的GitHub帳號下<br />接著到Azure Function的Platform Feature -> Deployment options -> Setup -> Choose Source 選擇 GitHub<br />
輸入相關認證，便可以看到fork回來的專案，點選即可自動部署進Azure Function

## 設定Azure Function Application setting variables
到Azure Function的Platform Feature -> Application Settings -> Add new setting, 新增下列幾項設定
* LineLoginClientID：你申請LINE Login的Channel ID
* LineLoginClientSecret：你申請LINE Login的Channel Secret
* LineNotifyClientID：你申請LINE Notify的Client Secret
* LineNotifyClientSecret：你申請LINE Login的Client Secret
* LineLoginRedirectUrl：Azure Function **Line-Login-Callback**的URL位址
* LineNotifyRedirectUrl：Azure Function **Line-Notify-Callback**的URL位址
* my_DOCUMENTDB：
AccountEndpoint=https://**<你的cosmos DB HOST>**:443/;AccountKey=**<你的cosmos DB PASSWORD>**;
* LineMessagingAPIAccessToken (如果你有申請LINE Messaging API帳號，才需要新增此項目, 否則請略過)

# 請使用者進行登錄
請將下列超連結，將<>括起來的地方，更換為你自己的值，再將此連結傳送給使用者點選即可
> https://access.line.me/dialog/oauth/weblogin?response_type=code&client_id=<你申請LINE Login的Channel ID>&redirect_uri=https://<Azure Function **Line-Login-Callback**的URL位址>&state=<使用者姓名>

若使用者點選並操作完成，你便可以取得使用者的相關資訊，該資訊會在Cosmos DB裡的Line Collection

# 使用Notify API傳送訊息給使用者
透過REST API 的方式
> https://<Azure Function **Line-Send-Notify**的URL位址>?name=<使用者姓名>&message=<你的訊息內容>