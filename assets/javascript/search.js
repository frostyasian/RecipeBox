var queryString = "https://api.edamam.com/search?q=";
var searchTerm = "";
var range = 25;
var current = 0;
var max = 25;
var firstSearch = true;
//the search method performs an ajax get request to the API and returns the results to
//the searchResults array.
$("#search-icon").on("click", function() {
  if (firstSearch) {
    $(".search-bar")
      .detach()
      .insertAfter($(".gap1"));
    firstSearch = false;
  }
  searchTerm = $("#recipe-search")
    .val()
    .trim();
  var resultRange = "&from=0&to=100";
  $.ajax({
    url: queryString + searchTerm + apiKey + resultRange,
    method: "GET"
  })
    .then(function(response) {
      searchResults = [];
      for (var i = 0; i < response.hits.length; i++) {
        searchResults.push(response.hits[i].recipe);
      }
      if (searchResults.length === 0) {
        console.error("your search returned " + searchResults.length + " results");
        displayError("invalid search", "This one's on you. Your search returned 0 results.");
        return;
      }

      displayResults(true);
      //increment the database ref for the user if a search is successful - i.e. only count successful searches
      if (currentUser !== undefined) {
        userProfileRef
          .once("value", function(snapshot) {
            var searches = parseInt(snapshot.val().searches);
            searches++;
            updateData(userProfileRef, { searches: searches });
          })
          .catch(function(err) {
            console.log("ERROR -" + err.code + ": " + err.message);
            displayError(err.code, err.message);
          });
      }
    })

    .catch(function(err) {
      //handle api call errors here

      console.log("ERROR -" + err.code + ": " + err.message);
      displayError(err.code, err.message);
    });
});

//once the results are stored in the searchResults array, this function is called.
//loop over the array and build the cards for each search result.
//TODO - remove the method that pushes test data to the array
function displayResults(clear = true) {
  if (clear) {
    //if the user has a saved recipe displayed and then performs a search, the recipe display modal
    //was destroyed so no further recipes could be viewed. Here is a fix.
    $("#recipe-display-modal")
      .detach()
      .appendTo($("#storage"));

    $(".results").empty();
    range = 25;
    current = 0;
    max = 25;
  } else {
    $(".load-more").remove();
  }
  //check for range vs. number of results
  if (max > searchResults.length) {
    max = searchResults.length;
  }

  for (var i = current; i < max; i++) {
    var recipe = searchResults[i];
    var title = recipe.label;
    if (title.length > 20) {
      var truncatedTitle = title.substring(0, 18) + "...";
      title = truncatedTitle;
    }
    var imageUrl = recipe.image;
    var time = recipe.totalTime; //DEBUG - not all recipes have total time
    var index = i.toString();

    var card = buildCard(title, imageUrl, time, index);
    card.appendTo($(".results"));
  }
  current = max;
  max += range;
  //the api will return a max of 100 results per query. if range >100, dont't display the
  //load more card
  if (max <= searchResults.length) {
    //make a card that will display the next bulk set of results
    $("<div>")
      .addClass("load-more")
      .text("show " + range + " more")
      .appendTo(".results");
  }
}

function buildCard(title, imgUrl, time, index) {
  //index points to the recipe object in search results
  var card = $("<div>")
    .addClass("card")
    .attr("data-index", index + "")
    .attr("data-source", "0")
    .attr("dragable", "true");
  var cardtitle = $("<div>")
    .addClass("card-title")
    .text(title);
  var imgDiv = $("<div>").addClass("card-img-box");

  var img = $("<img>")
    .attr("src", imgUrl)
    .addClass("recipe-card-small");
  var preptime = $("<div>")
    .addClass("card-time")
    .text(formatTime(time));

  imgDiv.append(img);
  card.append(cardtitle, imgDiv, preptime);
  return card;
}

function getGiph() {
  var giphQueryString = "https://api.giphy.com/v1/stickers/random?tag=cat&api_key=";
  $.ajax({
    url: giphQueryString + giphKey,
    method: "GET"
  })
    .then(function(response) {
      $("#error-image").attr("src", response.data.image_original_url);
    })
    .catch(function(err) {
      //handle api call errors here

      console.log("ERROR -" + err.code + ": " + err.message);
    });
}
//global variable for the looping giph interval
var giphInterval;

function displayError(error_title, error_message) {
  var target = $(".results");
  var parent = $("<div>")
    .addClass("container-fluid")
    .addClass("error-parent");
  //the error header inside a jumbotron

  var title = $("<h1>").text("Well, that's not great.");
  var subtitle = $("<p>")
    .addClass("lead")
    .text("We got an error. You get a cat gif.");
  parent.append(title, subtitle);

  //the error card
  var card = $("<div>")
    .addClass("card")
    .addClass("mx-auto")
    .css("width", "300px");
  //the img has no source until we call the getGiph function...
  var img = $("<img>")
    .attr("id", "error-image")
    .addClass("card-img-top")
    .attr("alt", "a gat gif to make you smile");
  var cardbody = $("<div>").addClass("card-body");

  var errorTitle = $("<h5>")
    .addClass("card-title")
    .text(error_title);

  var errorMessage = $("<p>")
    .addClass("card-text")
    .text(error_message);
  var close = $("<button>")
    .text("Okay. Fine.")
    .attr("id", "error-button")
    .attr("type", "button")
    .addClass("btn")
    .addClass("btn-secondary");
  cardbody.append(errorTitle, errorMessage, close);
  card.append(img, cardbody);
  parent.append(card);
  $("#recipe-display-modal")
    .detach()
    .appendTo($("#storage"));
  target.empty();
  target.append(parent);
  getGiph();
  giphInterval = setInterval(function() {
    getGiph();
  }, 5000);
}

$(document).on("click", "#error-button", function() {
  clearInterval(giphInterval);
  $(".results").empty();
});
