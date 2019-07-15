/**
 * Socket.ioを使用したキャラ移動 その3
 * https://socket.io/get-started/chat/
 */

//--------------------------------------
// モジュール読み込み
//--------------------------------------
const port = 3000;
const app  = require("express")();
const http = require("http").Server(app);
const io   = require("socket.io")(http);

//--------------------------------------
// Webサーバ
//--------------------------------------
app.get("/", (req, res)=>{
  res.sendFile(__dirname + "/MarioCart.html");
});
app.get("/image/:file", (req, res)=>{
  res.sendFile(__dirname + "/image/" + req.params.file);
});
http.listen(port, ()=>{
  console.log(`listening on *:${port}`);
});

//--------------------------------------
// Socket.io
//--------------------------------------
// 定数
const MAX_WIDTH  = 400;     // 横幅
const MAX_HEIGHT = 300;     // 高さ

// プレイヤー情報 (マスター)
let CHAR_LIST = {};
let ZINDEX = 1000;          //レイヤーの順番

io.on("connection", (socket)=>{
  console.log(`ユーザー「${socket.id}」が接続しました`);

  //----------------------------
  // ログイン
  //----------------------------
  socket.on("login", (data)=>{
    // 初期座標を決定
    const pos = {
      x: 40,
      y: getInitPos(MAX_HEIGHT)
    };

    // マスターに追加
    CHAR_LIST[data.token] = {
         pos: pos,          // 座標
        type: data.char,    // キャラクター種別(1〜4)
      zindex: ZINDEX,       // レイヤー深度
          id: socket.id     // socket.ioのユーザー識別用ID
    };

    // 送信者のみに通知
    io.to(socket.id).emit("logged-in", CHAR_LIST);

    // 送信者以外のユーザーに通知
    socket.broadcast.emit("newPlayer", {token:data.token, type:data.char, pos:pos, zindex:ZINDEX});

    // 次にログインしたユーザーは上になる
    ZINDEX++;

    console.log("[login]", CHAR_LIST);
  });

  //----------------------------
  // キャラクターの動きを同期
  //----------------------------
  socket.on("movechar", (data)=>{
    // サーバ内で座標を計算
    moveChar(data.token, data.key);

    // 計算後の座標をセット
    data.pos = CHAR_LIST[data.token].pos;

    // 全ユーザーへ送信
    io.emit("movechar", data);
    console.log("[movechar]", data);
  });

  //----------------------------
  // 切断
  //----------------------------
  socket.on("disconnect", ()=>{
    let token = removeChar(socket.id);                // マスターから削除
    socket.broadcast.emit("logout", {token:token});   // 一斉送信

    console.log(`ユーザー「${socket.id}」が切断しました`);
  });
});

/**
 * キャラの初期座標を決定する (x, y共通)
 *
 * @param {integer} max 最大値
 * @return {integer}
 */
function getInitPos(max){
  return(
    Math.floor( Math.random() * max )
  );
}

/**
 * キャラクターを押されたキーに合わせて移動
 *
 * @param {string}  token  プレイヤー識別用の文字列
 * @param {integer} keycd  押下されたキーボード
 * @param {integer} step   1回の移動量
 */
function moveChar(token, keycd, step=50){
  const pos = CHAR_LIST[token].pos;    // 現在の座標を取得
  let x, y;

  // キャラを移動させる
  switch(keycd){
    case 119:  //W ↑
      x = pos.x;
      y = pos.y - step;
      break;
    case 97:   //A ←
      x = pos.x - step;
      y = pos.y;
      break;
    case 115:  //S ↓
      x = pos.x;
      y = pos.y + step;
      break;
    case 100:  //D →
      x = pos.x + step;
      y = pos.y;
      break;
    default:
      console.log(keycd);
      break;
    }

    // マスター更新
    CHAR_LIST[token].pos.x = x;
    CHAR_LIST[token].pos.y = y;
}

/**
 * キャラクターを削除
 *
 * @param {string}  id  socket.id
 * @return {string}
 */
function removeChar(id){
  for (const key in CHAR_LIST) {
    if( CHAR_LIST[key].id === id ){
      delete CHAR_LIST[key];
      console.log("[removeChar]", "Found", id, key);
      return(key);
    }
  }

  console.log("[removeChar]", "NotFound", id);
  return(false);
}
