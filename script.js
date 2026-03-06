const versionButtons = Array.from(document.querySelectorAll(".version-btn"));
const versionPanes = Array.from(document.querySelectorAll(".version-pane"));
const guideControllers = new Map();

const guideSteps = {
  cn: [
    "步骤 1：打开 iPhone 购买页面",
    "步骤 2：选择机型",
    "步骤 3：选择颜色",
    "步骤 4：选择存储容量",
    "步骤 5：确认版本",
    "步骤 6：复制当前页面链接",
    "步骤 7：停在加入购物袋之前"
  ],
  us: [
    "Step 1: Open iPhone page",
    "Step 2: Select model",
    "Step 3: Select color",
    "Step 4: Select storage",
    "Step 5: Confirm unlocked/finish",
    "Step 6: Copy URL from browser",
    "Step 7: Stop before Add to Bag"
  ]
};

function valueOrDash(value) {
  return value && value.trim() ? value.trim() : "-";
}

function yesNo(value) {
  return value ? "YES" : "NO";
}

function formatExtrasSummary(data, locale) {
  const tradeIn = Boolean(data.tradeInRequested);
  const appleCare = Boolean(data.appleCareWanted);
  const tradeInModel = valueOrDash(data.tradeInModel);

  if (locale === "cn") {
    return [
      "",
      "---- 仅供我参考 ----",
      `折抵换购 ${tradeIn ? "需要" : "不需要"}${tradeIn && tradeInModel !== "-" ? ` (${tradeInModel})` : ""}`,
      `AppleCare+ ${appleCare ? "需要" : "不需要"}`
    ].join("\n");
  }

  return [
    "",
    "---- For my reference ----",
    `Trade in ${tradeIn ? "YES" : "NO"}${tradeIn && tradeInModel !== "-" ? ` (${tradeInModel})` : ""}`,
    `AppleCare+ ${appleCare ? "YES" : "NO"}`
  ].join("\n");
}

function validateProductUrl(version, rawValue) {
  const value = (rawValue || "").trim();

  if (!value) {
    return { valid: true };
  }

  let url;
  try {
    url = new URL(value);
  } catch (_error) {
    return {
      valid: false,
      message:
        version === "cn"
          ? "请输入完整的 Apple 商品链接。"
          : "Please enter a full Apple product URL."
    };
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();
  const step = (url.searchParams.get("step") || "").toLowerCase();

  const validHost =
    version === "cn"
      ? /(^|\.)apple\.com\.cn$/.test(hostname)
      : /(^|\.)apple\.com$/.test(hostname) && !hostname.endsWith(".cn");

  if (!validHost) {
    return {
      valid: false,
      message:
        version === "cn"
          ? "请粘贴 Apple 中国官网商品链接。"
          : "Please paste a product URL from Apple US."
    };
  }

  if (!pathname.startsWith("/shop/buy-")) {
    return {
      valid: false,
      message:
        version === "cn"
          ? "这看起来不是产品配置页面链接，请从 Apple 商品配置页面直接复制。"
          : "This does not look like a product configuration page URL. Copy it directly from the Apple product page."
    };
  }

  const blockedStep = ["attach", "watchattach", "bag", "checkout"];
  if (blockedStep.some((token) => step.includes(token)) || pathname.includes("/bag")) {
    return {
      valid: false,
      message:
        version === "cn"
          ? "这个链接看起来已经进入加入购物袋后的步骤。请回到加入购物袋前，直接复制当前商品页面链接。"
          : "This link looks like it is already past the product page. Go back and copy the URL right before Add to Bag."
    };
  }

  return { valid: true };
}

function setSectionRequirements(section, required) {
  const fields = section.querySelectorAll("input, textarea, select");
  fields.forEach((field) => {
    if (field.dataset.optional === "true") {
      field.removeAttribute("required");
      return;
    }

    if (required) {
      field.setAttribute("required", "required");
    } else {
      field.removeAttribute("required");
    }
  });
}

function buildGuideController(pane, steps) {
  const videoWrap = pane.querySelector(".guide-video-wrap");
  const video = pane.querySelector(".guide-video");
  const fallback = pane.querySelector(".guide-fallback");
  const stepLabel = pane.querySelector(".step-label");
  const optionCards = Array.from(pane.querySelectorAll(".option-card"));
  const urlCopyRow = pane.querySelector(".url-copy-row");
  const addToBagRow = pane.querySelector(".add-to-bag-row");
  const replayBtn = pane.querySelector(".replay-btn");
  let timer = null;
  let stepIndex = 0;
  let videoReady = false;

  function reset() {
    stepIndex = 0;
    stepLabel.textContent = steps[0];
    optionCards.forEach((card) => card.classList.remove("active"));
    urlCopyRow.classList.remove("visible");
    addToBagRow.classList.remove("visible");
  }

  function useFallback() {
    videoReady = false;
    if (videoWrap) videoWrap.hidden = true;
    if (fallback) fallback.hidden = false;
  }

  function useVideo() {
    if (!video || !videoWrap || !fallback) return;
    videoReady = true;
    clearInterval(timer);
    videoWrap.hidden = false;
    fallback.hidden = true;

    if (pane.classList.contains("is-active")) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }

  const videoSrc = video?.querySelector("source")?.getAttribute("src")?.trim();
  if (video && videoSrc) {
    useFallback();
    video.addEventListener("loadeddata", useVideo);
    video.addEventListener("error", useFallback);
    video.load();
  } else {
    useFallback();
  }

  function play() {
    clearInterval(timer);

    if (videoReady && video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      return;
    }

    reset();

    timer = setInterval(() => {
      stepIndex += 1;
      if (stepIndex >= steps.length) {
        clearInterval(timer);
        return;
      }

      stepLabel.textContent = steps[stepIndex];

      if (stepIndex >= 1 && stepIndex <= 4) {
        optionCards[stepIndex - 1].classList.add("active");
      }

      if (stepIndex === 5) {
        urlCopyRow.classList.add("visible");
      }

      if (stepIndex === 6) {
        addToBagRow.classList.add("visible");
      }
    }, 920);
  }

  replayBtn.addEventListener("click", play);

  return {
    play,
    stop() {
      clearInterval(timer);
      if (videoReady && video) video.pause();
    }
  };
}

function formatCnMessage(data) {
  const timestamp = new Date().toISOString();
  const fulfillment = data.fulfillmentType === "delivery" ? "DELIVERY" : "PICKUP";
  const lines = [
    "EPP_ORDER_START",
    `VERSION: CN`,
    `TIMESTAMP: ${timestamp}`,
    `FULFILLMENT: ${fulfillment}`,
    `PRODUCT_URL: ${valueOrDash(data.productUrl)}`
  ];

  if (data.fulfillmentType === "delivery") {
    lines.push(`SURNAME: ${valueOrDash(data.surname)}`);
    lines.push(`GIVEN_NAME: ${valueOrDash(data.givenName)}`);
    lines.push(`ADDRESS_AREA: ${valueOrDash(data.addressArea)}`);
    lines.push(`DETAIL_ADDRESS: ${valueOrDash(data.detailAddress)}`);
    lines.push(`ADDITIONAL_ADDRESS: ${valueOrDash(data.additionalAddress)}`);
    lines.push(`COUNTRY_REGION: ${valueOrDash(data.countryRegion)}`);
    lines.push(`PHONE: ${valueOrDash(data.receiverPhone)}`);
    lines.push(`EMAIL: ${valueOrDash(data.receiverEmail)}`);
  } else {
    lines.push(`PICKUP_SURNAME: ${valueOrDash(data.pickupSurname)}`);
    lines.push(`PICKUP_GIVEN_NAME: ${valueOrDash(data.pickupGivenName)}`);
    lines.push(`PICKUP_EMAIL: ${valueOrDash(data.pickupEmail)}`);
    lines.push(`PICKUP_PHONE: ${valueOrDash(data.pickupContactPhone)}`);
  }

  lines.push("EPP_ORDER_END");
  return lines.join("\n") + formatExtrasSummary(data, "cn");
}

function formatUsMessage(data) {
  const timestamp = new Date().toISOString();
  const fulfillment = data.fulfillmentType === "delivery" ? "DELIVERY" : "PICKUP";
  const lines = [
    "EPP_ORDER_START",
    `VERSION: US`,
    `TIMESTAMP: ${timestamp}`,
    `FULFILLMENT: ${fulfillment}`,
    `PRODUCT_URL: ${valueOrDash(data.productUrl)}`
  ];

  if (data.fulfillmentType === "delivery") {
    lines.push(`FIRST_NAME: ${valueOrDash(data.deliveryFirstName)}`);
    lines.push(`LAST_NAME: ${valueOrDash(data.deliveryLastName)}`);
    lines.push(`STREET_ADDRESS: ${valueOrDash(data.deliveryStreetAddress)}`);
    lines.push(`ADDRESS_LINE_2: ${valueOrDash(data.deliveryStreetAddress2)}`);
    lines.push(`ZIP_CODE: ${valueOrDash(data.deliveryZipCode)}`);
    lines.push(`CITY_STATE: ${valueOrDash(data.deliveryCityState)}`);
    lines.push(`COUNTRY_REGION: ${valueOrDash(data.deliveryCountryRegion)}`);
    lines.push(`PHONE: ${valueOrDash(data.deliveryPhone)}`);
    lines.push(`EMAIL: ${valueOrDash(data.deliveryEmail)}`);
  } else {
    lines.push(`PICKUP_FIRST_NAME: ${valueOrDash(data.pickupFirstName)}`);
    lines.push(`PICKUP_LAST_NAME: ${valueOrDash(data.pickupLastName)}`);
    lines.push(`PICKUP_EMAIL: ${valueOrDash(data.pickupEmail)}`);
    lines.push(`PICKUP_PHONE: ${valueOrDash(data.pickupPhone)}`);
    lines.push(`PICKUP_ZIP_CODE: ${valueOrDash(data.pickupZipCode)}`);
    lines.push(`PICKUP_STORE_NAME: ${valueOrDash(data.pickupStoreName)}`);
  }

  lines.push("EPP_ORDER_END");
  return lines.join("\n") + formatExtrasSummary(data, "us");
}

function initFormController(pane) {
  const form = pane.querySelector(".order-form");
  const deliveryFields = form.querySelector(".delivery-fields");
  const pickupFields = form.querySelector(".pickup-fields");
  const fulfillmentRadios = Array.from(form.querySelectorAll('input[name="fulfillmentType"]'));
  const resultPanel = pane.querySelector(".result-panel");
  const messageBox = pane.querySelector(".formatted-message");
  const copyBtn = pane.querySelector(".copy-message-btn");
  const productUrlInput = form.querySelector('input[name="productUrl"]');
  const productUrlHint = form.querySelector(".url-hint");
  const tradeInToggle = form.querySelector(".trade-in-toggle");
  const tradeInModelGroup = form.querySelector(".trade-in-model-group");
  const tradeInModelInput = tradeInModelGroup?.querySelector("input");
  const version = form.dataset.version;

  function switchFulfillment(type) {
    const isDelivery = type === "delivery";
    deliveryFields.hidden = !isDelivery;
    pickupFields.hidden = isDelivery;
    setSectionRequirements(deliveryFields, isDelivery);
    setSectionRequirements(pickupFields, !isDelivery);
  }

  fulfillmentRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      switchFulfillment(event.target.value);
    });
  });

  function syncTradeInFields() {
    const enabled = Boolean(tradeInToggle?.checked);
    if (tradeInModelGroup) tradeInModelGroup.hidden = !enabled;
    if (tradeInModelInput) {
      if (enabled) {
        tradeInModelInput.setAttribute("required", "required");
      } else {
        tradeInModelInput.removeAttribute("required");
        tradeInModelInput.value = "";
      }
    }
  }

  tradeInToggle?.addEventListener("change", syncTradeInFields);

  function syncProductUrlValidation() {
    if (!productUrlInput) return true;

    const { valid, message } = validateProductUrl(version, productUrlInput.value);
    productUrlInput.setCustomValidity(valid ? "" : message);

    if (productUrlHint) {
      productUrlHint.textContent = valid ? productUrlHint.dataset.default : message;
      productUrlHint.classList.toggle("error", !valid);
    }

    return valid;
  }

  productUrlInput?.addEventListener("input", syncProductUrlValidation);
  productUrlInput?.addEventListener("blur", syncProductUrlValidation);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncProductUrlValidation();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    const message = version === "cn" ? formatCnMessage(data) : formatUsMessage(data);
    messageBox.value = message;
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  copyBtn.addEventListener("click", async () => {
    if (!messageBox.value) return;

    try {
      await navigator.clipboard.writeText(messageBox.value);
      copyBtn.textContent = copyBtn.dataset.copiedText;
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = copyBtn.dataset.defaultText;
        copyBtn.classList.remove("copied");
      }, 1400);
    } catch (_error) {
      messageBox.focus();
      messageBox.select();
    }
  });

  switchFulfillment("delivery");
  syncTradeInFields();
  syncProductUrlValidation();
}

function switchVersion(version) {
  versionPanes.forEach((pane) => {
    const isActive = pane.dataset.version === version;
    pane.hidden = !isActive;
    pane.classList.toggle("is-active", isActive);
  });

  versionButtons.forEach((btn) => {
    const isActive = btn.dataset.version === version;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  const htmlLang = version === "cn" ? "zh-CN" : "en";
  document.documentElement.setAttribute("lang", htmlLang);

  guideControllers.forEach((controller, key) => {
    if (key !== version) controller.stop();
  });
  guideControllers.get(version)?.play();
}

versionPanes.forEach((pane) => {
  const version = pane.dataset.version;
  guideControllers.set(version, buildGuideController(pane, guideSteps[version]));
  initFormController(pane);
});

versionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchVersion(btn.dataset.version);
  });
});

switchVersion("cn");
