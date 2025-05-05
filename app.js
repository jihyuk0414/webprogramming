const express = require("express");
const router = express.Router();
const app = express();
const port = 3001;
const db = require('./db');
const axios = require('axios');

var fs = require('fs');
var ejs = require('ejs');

const bcrypt = require('bcrypt');

app.engine('html', require('ejs').renderFile);
app.set("view engine", "ejs");
const path = require('path');
app.set('views', path.join(__dirname, 'views'));

const mysql = require('mysql2');

const session = require('express-session');
const bodyParser = require('body-parser');

const livereload = require('livereload');
const livereloadMiddleware = require('connect-livereload');

const liveServer = livereload.createServer({
  exts: ['html', 'css', 'ejs', 'js'],
  debug: true
});

liveServer.watch(__dirname);

app.use(livereloadMiddleware());

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

const connection = mysql.createConnection({
  host:'localhost',
  user:'root',
  password:'1234',
  port:3306,
  database:'nodejs'
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get('/', function (req, res, next) {
  db.getAllMemos((rows) => {
    db.getRankMemos((data) =>{
      if(req.session.user){
        res.render(__dirname + '/views/main.ejs', { rows: rows, 
                                                    data: data,
                                                    user: req.session.user });
      }
      else{
        res.render(__dirname + '/views/main.ejs', { rows: rows, data: data, });
      }
    })

    
  });
});

app.listen(port, () => {
  console.log("서버가 실행됩니다.");
  console.log("http://localhost:3001/");
});

app.use('/', express.static("css"));
app.use('/', express.static("images"));
app.use('/', express.static("js"));

app.get("/board/:category/:cur", function (req, res) {
  var searchKeyword = req.query.search || "";
  var category = req.params.category;
  
  // 카테고리 유효성 검사
  if (!['free', 'official', 'unofficial'].includes(category)) {
    return res.redirect('/board/free/1');
  }
  
  // 카테고리 타이틀 설정
  let boardTitle = '';
  switch(category) {
    case 'free':
      boardTitle = '자유 게시판';
      break;
    case 'official':
      boardTitle = '정규 동아리 게시판';
      break;
    case 'unofficial':
      boardTitle = '사설 동아리 게시판';
      break;
  }

  var page_size = 10;
  var page_list_size = 10;
  var no = "";
  var totalPageCount = 0;
  
  // 카테고리 포함한 쿼리 수정
  if (!searchKeyword) {
    var queryString = 'SELECT count(*) AS cnt FROM board WHERE category = ?';
  } else {
    var queryString = `SELECT count(*) AS cnt FROM board WHERE category = ? AND title LIKE ${connection.escape('%' + searchKeyword + '%')}`;
  }
  
  connection.query(queryString, [category], function (error2, data) {
    if (error2) {
      console.log(error2 + "메인 화면 mysql 조회 실패");
      return
    }

    totalPageCount = data[0].cnt;
    var curPage = req.params.cur || 1;

    if (totalPageCount < 0) {
      totalPageCount = 0
    }

    var totalPage = Math.ceil(totalPageCount / page_size);
    var totalSet = Math.ceil(totalPage / page_list_size);       
    var curSet = Math.ceil(curPage / page_list_size) 
    var startPage = ((curSet - 1) * 10) + 1 
    var endPage = (startPage + page_list_size) - 1;

    if (curPage < 0) {
      no = 0
    } else {
      no = (curPage - 1) * 10
    }
    
    var result2 = {
      "curPage": curPage,
      "page_list_size": page_list_size,
      "page_size": page_size,
      "totalPage": totalPage,
      "totalSet": totalSet,
      "curSet": curSet,
      "startPage": startPage,
      "endPage": endPage,
      "searchKeyword": searchKeyword,
    };

    // 카테고리 포함한 함수로 변경
    db.getMemosPagenation(no, page_size, searchKeyword, category, (rows) => {
      if(req.session.user){
        res.render(__dirname + '/views/board.ejs', {
          data: rows,
          pasing: result2,
          user: req.session.user,
          category: category,
          boardTitle: boardTitle
        });
      }
      else{
        res.render(__dirname + '/views/board.ejs', {
          data: rows,
          pasing: result2,
          category: category,
          boardTitle: boardTitle
        });
      }
    });
  });
});

app.get("/main", function (req, res) {

  res.redirect('board/official/1');

});

app.get("/board", function (req, res) {
  res.redirect('/board/official/1');
});

app.get('/write', (req, res) => {

  let today = new Date();
  today.setHours(today.getHours() + 9);
  let date = today.toISOString().replace('T', ' ').substring(0, 10);
  const category = req.query.category || 'free'; 

  if(req.session.user){
    res.render(__dirname + '/views/write.ejs', { date, user: req.session.user, category : category });
  }
  else{
    res.status(400).json({ message: '로그인 후 이용가능합니다.' });
  }
  
});

app.get('/checkSession', (req, res) => {
  if (req.session.user) {
    res.json({ sessionExists: true });
  } else {
    res.json({ sessionExists: false });
  }
});


app.use('/insert', function (req, res, next) {
  let title = req.body.title;
  let name = req.body.name;
  let content = req.body.content;
  let category = req.body.category;
  if(title.length <= 0){
    res.status(400).json({ message: '글 제목을 입력해주세요.' });
        return;
  }
  else if(content.length <= 0){
    res.status(400).json({ message: '내용을 입력해주세요.' });
    return;
  }
  db.insertMemo(content, title, name, category);

  res.redirect('/main');
});

app.use('/modify', function (req, res, next) {
  let title = req.query.title;
  let value = req.query.value;
  let name = req.query.name;
  
  db.getInfo(title, value, name, (rows) => {
    res.render(__dirname + '/views/modify.ejs', { rows: rows, user: req.session.user });
  });
});

app.use('/update', function (req, res, next) {
  let title = req.query.title;
  let name = req.query.name;
  let content = req.body.content;
  let value = req.query.value;

  db.memoUpdate(title, value, name, content);
  
  res.redirect(`/memo/?title=${title}&value=${value}&name=${name}&category=${category}`);
});

app.use('/delete', function (req, res, next) {
  let title = req.body.title;
  let name = req.body.name;
  let value = req.body.value;

  db.memoDelete(title, name, value);

  res.send('게시글이 삭제되었습니다.');
});


app.get('/memo', (req, res) => {
  let title = req.query.title;
  let value = req.query.value;
  let category = req.query.category;
  console.log(category + " categry ");
  db.watchCount(title, value);
  db.getMemo(title, value, (rows) => {

    if(req.session.user){
      res.render(__dirname + '/views/memo.ejs', { rows: rows, user: req.session.user, category : category });
    }
    else{
      res.render(__dirname + '/views/memo.ejs', { rows: rows, category : category });
    }
  });
});

app.get('/checkMemoSession', (req, res) => {
  
  let name = req.query.name;

  if(req.session.user){

    if (req.session.user.name === name) {
      res.json({ sessionCompare: true });
    } else {
      res.json({ sessionCompare: false });
    }

  }else{
    res.json({ sessionCompare: false });
  }
});

app.get('/loginpage', (req, res) => {
  res.render(__dirname + '/views/login.html');
});

app.use('/login', (req, res) => {
  let id = req.body.id;
  let password = req.body.password;
  let previousUrl = req.body.prevUrl;
  let main = '/';
  console.log(previousUrl);

  db.checkUser(id, (rows) => {
    if (rows.length > 0) {
      let same = bcrypt.compareSync(password, rows[0].password);
      console.log("DB에서 가져온 사용자 정보:", rows[0]);

      if (same) {
        req.session.user = {
          id: id,
          name: id,
          nickname: rows[0].nickname
        };
        if (previousUrl) {
          res.send(previousUrl);
        } else {
          res.redirect(main);
        }
      } else {
        res.status(400).json({ message: '비밀번호를 확인해주세요.' });
        return;
      }
    } else {
      res.status(400).json({ message: '아이디를 확인해주세요.' });
      return;
    }
  });
});


app.get('/logout', (req, res) => {
  
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/');
  });
});


app.get('/signin', (req, res) => {
  res.render(__dirname + '/views/signin.html');
});

app.use('/sign', (req, res) => {

  let id = req.body.id;
  let password = req.body.password;
  let nickname = req.body.nickname;
  console.log(nickname);

  const encryptedPassowrd = bcrypt.hashSync(password, 10);

  if (id.length < 10) {
    res.status(400).json({ message: '아이디는 최소 10글자 이상이어야 합니다.' });
    return;
  }
  else if (password.length < 5) {
    res.status(400).json({ message: '비밀번호는 최소 5글자 이상이어야 합니다.' });
    return;
  }
  else if (nickname.length < 3) {
    res.status(400).json({ message: '닉네임은 최소 3글자 이상이어야 합니다.' });
    return;
  }
  else {
    db.getUser(id, nickname, (rows) => {
      if (rows.length <= 0) {
        console.log(rows);
        db.insertUser(id, encryptedPassowrd, nickname);

        res.redirect('/loginpage');
      }
      else {
        res.status(400).json({ message: '이미 존재하는 아이디 입니다.' });
        return;
      }
    });

  }
});  

app.use('/commend', (req, res) => {
  let currentDate = new Date();
  const dateString = currentDate.toISOString();
  const formattedDate = dateString.replace(/[-T:.Z]/g, '');
  
  let value = req.query.value;
  let content = req.query.textBox;
  let user = req.session.user.name;
  let commendId = value + "_" + formattedDate;
  if(content <= 0){
    res.status(400).json({ message: '댓글을 작성해주세요.' });
    return;
  }
  else{
    db.commendInsert(value, content, user, commendId);
    res.send('댓글 작성이 완료되었습니다.');
  }
  
});


app.use('/getCommend', (req, res) => {
  let value = req.query.value;
  let offset = parseInt(req.query.offset) || 0; 
  let limit = 5; 

  db.getCommend(value, offset, limit, (rows) => {
    res.json(rows);
  });
});


app.get('/getCommentCount', (req, res) => {
  let value = req.query.value;  
  db.getCommendCount(value, (rows) => {
    res.json(rows); 
  });
});

app.use('/getRecommend', (req, res) => {
  let commendId = req.query.id;

  let offset = parseInt(req.query.offset);
  let limit = 5;

  db.getRecommend(commendId, offset, limit, (rows) => {
    res.json(rows);
    console.log(rows);
  });
});

app.use('/writeRecommend', (req, res) => {
  let recommend_content = req.query.recommendtext; 
  let commend_id = req.query.id; 
  let recommend_id = commend_id + "_" + Math.floor(Math.random() * 9999); 


  
  if (req.session.user) {

    let recommend_name = req.session.user.name;

    if(recommend_content.length <= 0){
      res.status(400).json({ message: '답글을 작성해주세요.'});
      return;
    }
    else{

      db.insertRecommend(commend_id, recommend_name, recommend_content, recommend_id);
      res.send('답글 작성이 완료되었습니다.');
    }

  } else {
    res.send('로그인 후 사용가능합니다.');
  }

});

// 좋아요 기능
app.use('/loadLikes', (req, res) => {
  let value = req.body.value;  
  db.loadLikes(value, (rows) => {
    res.json(rows); 
  });
});


app.use('/Likes', (req, res) => {
  let value = req.body.value;  
  let name = req.body.user;
  let title = req.body.title;

  let userId = req.session.user.name;

  db.checkLikes(value, userId, (exists) => {
    if(!exists){
      db.Likes(value, userId);
      db.updateLikes(value, title, name);
      res.send("좋아요!"); 
    }else{
      db.cancelLikes(value, userId);
      db.deleteLikes(value, title, name);
      res.send("좋아요 취소...");
    }
  });

});

app.use('/checkLikes', (req, res) => {
  let value = req.body.value;

  if (req.session.user) {
    let userId = req.session.user.name;
    db.checkLikes(value, userId, (exists) => {
      res.send(exists ? true : false);
    });
  } else {
    res.send(false);
  }
});

app.use('/loadDislikes', (req, res) => {
  let value = req.body.value;  
  db.loadDislikes(value, (rows) => {
    res.json(rows); 
  });
});

app.use('/Dislikes', (req, res) => {
  let value = req.body.value;  
  let name = req.body.user;
  let title = req.body.title;

  let userId = req.session.user.name;

  db.checkDislikes(value, userId, (exists) => {
    if(!exists){
      db.Dislikes(value, userId);
      db.updateDislikes(value, title, name);
      res.send("싫어요..."); 
    }else{
      db.cancelDislikes(value, userId);
      db.deleteDislikes(value, title, name);
      res.send("싫어요 취소!");
    }
  });
});

app.use('/checkDislikes', (req, res) => {
  let value = req.body.value;

  if (req.session.user) {
    let userId = req.session.user.name;
    db.checkDislikes(value, userId, (exists) => {
      res.send(exists ? true : false);
    });
  } else {
    res.send(false);
  }
});

// API 키 설정
const UNIVCERT_API_KEY = '6749c62c-4130-42c6-9ce6-9147c27f91f3';

// 이메일 인증번호 발송
app.post('/api/v1/certify', async (req, res) => {
    const { email, univName } = req.body;
    
    try {
        const response = await axios.post('https://univcert.com/api/v1/certify', {
            key: UNIVCERT_API_KEY,
            email: email,
            univName: univName,
            univ_check: true
        });
        
        if (response.data.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: response.data.message });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

app.post('/api/v1/certifycode', async (req, res) => {
    const { email, code } = req.body;
    
    try {
        const response = await axios.post('https://univcert.com/api/v1/certifycode', {
            key: UNIVCERT_API_KEY,
            email: email,
            code: code
        });
        
        if (response.data.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: '인증번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});