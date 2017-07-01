window.makeShareAPI = function makeShareAPI(pyretVersion) {

  var showingNeedingHidden = [];
  function hideAllHovers() {
    showingNeedingHidden.forEach(function(hideIt) {
      hideIt();
    });
  }
  function makeHoverMenu(triggerElt, menuElt, showOnHover, onShow) {
    var divHover = false;
    var linkHover = false;
    var showing = false;
    function hovering() {
      return divHover || linkHover;
    }
    function show() {
      if(!showing) {
        hideAllHovers();
        menuElt.css({
          position: "fixed",
          top: triggerElt.offset().top + triggerElt.outerHeight(),
          left: triggerElt.offset().left,
          "z-index": 10000
        });
        $(document.body).append(menuElt);
        menuElt.fadeIn(250);
        showing = true;
        setTimeout(function() {
          $(document).on("click", hide);
        }, 0);
        onShow();
      }
    }
    var hide = function() {
      showing = false;
      menuElt.fadeOut(100);
      $(document).off("click", hide);
    };
    showingNeedingHidden.push(hide);
    menuElt.on("click", function(evt) {
      evt.stopPropagation();
    });
    triggerElt.on("click", function(e) {
      if(!showing) { show(); e.stopPropagation(); }
      else { hide(); }
    });
    return triggerElt;
  }

  $(".menuButton a").click(hideAllHovers);

  function makeShareLink(originalFile) {
    var link = $("<div>").append($("<button class=blueButton>").text("Publish"));
    var shareDiv = $("<div>").addClass("share");
    return makeHoverMenu(link, shareDiv, false,
      function() {
        showShares(shareDiv, originalFile);
      });
  }

  function showShares(container, originalFile) {
    var shareDiv = $("<div>");
    shareDiv.dialog({
      title: "Publish this file",
      modal: true,
      overlay : { opacity: 0.5, background: 'black'},
      width : "70%",
      height : "auto",
      closeOnEscape : true
    });
    var shares = originalFile.getShares();
    var displayDone = shares.then(function(sharedInstances) {
      if(sharedInstances.length === 0) {
        var words = $("<p>").text("This program has not been shared before.  Publishing it by clicking below will make a new copy of the file that you can share with anyone you like.  They will be able tto see your code and run your program.");
        var createNew = $("<button>").addClass("blueButton").text("Publish it!");
        shareDiv.append(words);
        shareDiv.append(createNew);
        createNew.click(function() {
          var copy = originalFile.makeShareCopy();
          copy.fail(function(err) {
            window.flashError("Couldn't copy the file for sharing.");
            //showShares(container, originalFile);
          });
          copy.then(function(f) {
            var shareUrl = makeShareUrl(f.getUniqueId());
            var box = autoHighlightBox(shareUrl);
            shareDiv.append($("<p>").text("Copy the link below to share it!  Close this window whenever you're done."));
            shareDiv.append(box);
            box.focus();
          });
        });
      }
      else { // has been shared before
        var words = $("<p>").text("This program has been shared before.  You can copy the link below and share it with anyone you like.  You can also re-publish it, which will copy the current content over the previously published copy.");
        var createNew = $("<button>").addClass("blueButton").text("Publish it!");
        var shareUrl = makeShareUrl(sharedInstances[0].getUniqueId());
        var box = autoHighlightBox(shareUrl);
        shareDiv.append(words);
        shareDiv.append(createNew);
        shareDiv.append(box);
        createNew.click(function() {
          originalFile.getContents().then(function(contents) {
            var saved = sharedInstances[0].save(contents, false);
            saved.fail(function(err) {
              window.flashError("Couldn't publish the file.");
              //showShares(container, originalFile);
            });
            saved.then(function(f) {
              window.flashMessage("Published program updated.")
            });
          })
          .fail(function() {
            window.flashError("Couldn't get the file contents for publishing");
          });
        });
      }
    });
  }

  function makeShareUrl(id) {
    var localShareUrl = "/editor#share=" + id;
    if(pyretVersion !== "") {
      localShareUrl += "&v=" + pyretVersion;
    }
    return window.location.origin + localShareUrl;
  }

  function getImportLetter(letter) {
    var maybeUpcase = letter.toUpperCase();
    var isUppercaseAlpha = !!/[A-Z]/.exec(maybeUpcase);
    if(isUppercaseAlpha) {
      return maybeUpcase;
    }
    else {
      return "M";
    }
  }

  function autoHighlightBox(text) {
    var textBox = $("<input type='text'>").addClass("auto-highlight");
    textBox.attr("size", text.length);
    textBox.attr("editable", false);
    textBox.on("focus", function() { $(this).select(); });
    textBox.on("mouseup", function() { $(this).select(); });
    textBox.val(text);
    return textBox;
  }

  function getLanguage() {
    if(typeof navigator !== "undefined") {
      return navigator.language || "en-US"; // Biased towards USA
    }
    else {
      return "en-US";
    }
  }

  var dateOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  };

  function drawShareRow(f) {
    var container = $("<div>").addClass("sharebox");
    var shareUrl = makeShareUrl(f.getUniqueId());
    var displayDate = new Date(f.getModifiedTime()).toLocaleString(getLanguage, dateOptions);
    var hoverDate = String(new Date(f.getModifiedTime()));
    container.append($("<label>").text(displayDate).attr("alt", hoverDate));
    var shareLink = $("<a href='javascript:void()'>").text("(Share Link)").addClass("copy-link");
    var importLink = $("<a href='javascript:void()'>").text("(Import Code)").addClass("copy-link");
    container.append(shareLink);
    container.append(importLink);
    function showCopyText(title, text) {
      var linkDiv = $("<div>").css({"z-index": 15000});
      linkDiv.dialog({
        title: title,
        modal: true,
			  overlay : { opacity: 0.5, background: 'black'},
        width : "70%",
        height : "auto",
        closeOnEscape : true
      });
      var box = autoHighlightBox(text);
      linkDiv.append(box);
      box.focus();
    }
    shareLink.click(function() {
      showCopyText("Copy Share Link", shareUrl);
    });

    var importLetter = getImportLetter(f.getName()[0]);
    var importCode = "import shared-gdrive(\"" + f.getName() +
        "\", \"" + f.getUniqueId() + "\") as " + importLetter;
    importLink.click(function() {
      showCopyText("Copy Import Code", importCode);
    });
    return container;
  }

  return {
    makeShareLink: makeShareLink,
    makeHoverMenu: makeHoverMenu,
    makeShareUrl: makeShareUrl
  };

}
