
$(document).ready(function() {
  let isEmailVerified = false;
    
  $('#sendCode').click(function() {
      const email = $('#univEmail').val();
      const univName = $('#univName').val();
      
      if (!email || !univName) {
          alert('대학 이메일과 대학교 이름을 입력해주세요.');
          return;
      }
      
      const domain = email.split('@')[1];
      if (!domain || !domain.includes('ac.kr')) {  
          alert('유효한 대학 이메일을 입력해주세요.');
          return;
      }
      
      $.ajax({
          type: 'POST',
          url: '/api/v1/certify',
          data: { email: email, univName: univName },
          success: function(response) {
              alert('인증번호가 발송되었습니다.');
              $('#verificationCode').prop('disabled', false);
              $('#verifyCode').prop('disabled', false);
              $('#sendCode').text('재발송').prop('disabled', false);
          },
          error: function(xhr, status, error) {
              alert('인증번호 발송에 실패했습니다: ' + error.message);
          }
      });
  });
  
  $('#verifyCode').click(function() {
      const email = $('#univEmail').val();
      const code = $('#verificationCode').val();
      
      if (!code) {
          alert('인증번호를 입력해주세요.');
          return;
      }
      
      $.ajax({
          type: 'POST',
          url: '/api/v1/certifycode',
          data: { email: email, code: code },
          success: function(response) {
              alert('대학생 인증이 완료되었습니다!');
              isEmailVerified = true;
              $('#signupForm input[type="submit"]').prop('disabled', false);
              $('#univEmail, #univName, #verificationCode').prop('disabled', true);
              $('#sendCode, #verifyCode').prop('disabled', true);
          },
          error: function(xhr, status, error) {
              alert('인증에 실패했습니다: ' + xhr.responseJSON.message);
          }
      });
  });


    $('#signupForm').submit(function(event) {
      event.preventDefault();
        
      if (!isEmailVerified) {
          alert('대학생 인증을 완료해주세요.');
          return;
      }
      var formData = $(this).serialize();
      $.ajax({
        type: 'POST',
        url: '/sign',
        data: formData,
        success: function(data) {
          window.location.href = '/loginpage';
        },
        error: function(xhr, status, error) {
          var errorMessage = xhr.responseJSON.message;
          alert(errorMessage);
        }
      });
    });
  });