//global variables for recipes
//store the names of the user tabs in an array. This array is mirrored on the server
var recipeTabs = [];
//an indexed array of search results
var searchResults = [];
//var the current working result in the array
var current = 0;
//the user-defined range of results to display at a time [5, 10, 25, 50]
var range = 25;
//a function called when a new user is created
function setProfileData(profileObject) {
  //var timeInMilis = new Date().getTime(); //this is a time string in miliseconds since Jan 1, 1970
  userProfileRef.set(profileObject).catch(function(err) {
    displayError(err.code, err.message);
    console.log("ERROR -" + err.code + ": " + err.message);
  });
}

//a function to call when updating a user's profile. dataObject
//is an object that must contain keys already present in the user
//profile directory! Only pass keys that are being updated, otherwise data may be lost.
function updateData(databaseRef, dataObject = {}) {
  databaseRef.update(dataObject).catch(function(err) {
    displayError(err.code, err.message);
    console.log("ERROR -" + err.code + ": " + err.message);
  });
}

//a function to store a recipe in the recipe box and on the server
function saveRecipe(recipeObject, tab) {
  if (currentUser === undefined) {
    //expand the box div and display the sign-in modal
    var isShowing = parseInt($("#box").attr("data-showing"));
    var box = $("#box");
    $("#auth-modal-in")
      .detach()
      .appendTo(box);
    if (!isShowing) {
      $("#box-click").trigger("click");
    }
    return;
  }
  if (tab === undefined || tab === null || recipeTabs.length === 0) {
    recipeTabs = ["default tab"];
    $("#tab-label").text("default tab");
    tab = "default tab";
    layoutTabs(recipeTabs, 0);
  }
  recipeObject = scrubKeys(recipeObject);
  //check for uniqueness
  var duplicate = false;
  var newURL = recipeObject.url;
  userRecipeBoxRef.child(tab).once("value", function(snapshot) {
    var allSavedRecipes = snapshot.val();
    if (allSavedRecipes !== null) {
      var recipeKeys = Object.keys(allSavedRecipes);
      for (var i = 0; i < recipeKeys.length; i++) {
        var savedURL = allSavedRecipes[recipeKeys[i]].url;

        if (savedURL === newURL) {
          duplicate = true;
        }
      }
    }
    if (!duplicate) {
      userRecipeBoxRef
        .child(tab)
        .push(recipeObject)
        .catch(function(err) {
          console.log("ERROR -" + err.code + ": " + err.message);
        })
        .then(function() {
          //then we update the recipe box loaclly.
          loadRecipes(tab);
          //and count the recipe
          userProfileRef.once("value", function(snapshot) {
            var storedRecipes = parseInt(snapshot.val().storedRecipes);
            storedRecipes++;
            updateData(userProfileRef, { storedRecipes });
          });
        })
        .catch(function(err) {
          displayError(err.code, err.message);
          console.log("ERROR -" + err.code + ": " + err.message);
        });
    }
  });

  //add the recipe to the tab directory on the server.
}

//a function to delete a recipe - TODO - update this function!!!!!
function deleteRecipe(tab, key) {
  userRecipeBoxRef
    .child(tab)
    .child(key)
    .remove()
    .then(function() {
      //console.log("recipe deleted from " + tab);
      loadRecipes(tab);
      //then log the deletion statistic
      userProfileRef.once("value", function(snapshot) {
        var deletedRecipes = parseInt(snapshot.val().deletedRecipes);
        deletedRecipes++;
        updateData(userProfileRef, { deletedRecipes });
      });
    })
    .catch(function(err) {
      displayError(err.code, err.message);
      console.log("ERROR -" + err.code + ": " + err.message);
    });
}

function fetchRecipeTabs() {
  userProfileRef
    .once("value", function(snapshot) {
      //store the snapshot value in a variable. The value is formatted as a JSON object

      var obj = snapshot.val();
      //if the user has nothing stored in their database, obj will be null
      if (obj === null) {
        //console.log("no recipes to load");
        return;
      }
      //if the user deleted all of their tabs, obj.tabs is undefined
      if (obj.tabs === undefined) {
        recipeTabs = [];
        layoutTabs(recipeTabs, 0);
      } else {
        recipeTabs = obj.tabs;
        layoutTabs(recipeTabs, 0);
        loadRecipes(recipeTabs[0]);
      }
    })
    .catch(function(err) {
      displayError(err.code, err.message);
      console.log("ERROR -" + err.code + ": " + err.message);
    });
}
