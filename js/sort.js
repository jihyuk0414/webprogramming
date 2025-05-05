$(document).ready(function () {

    $(".sort-select").on("change", function () {
        const selectedOption = $(this).val();
        const currentPage = 1; 
        const url = `/board/${currentPage}?sortOption=${selectedOption}`;
        $.ajax({
            type: "GET",
            url: url,
            success: function (data) {
                $('.table').html($(data).find('.table').html());
            },
            error: function (error) {
                console.log("AJAX 요청 에러:", error);
            }
        });
    });
});

