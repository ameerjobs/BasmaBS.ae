const KEY = "bassmah-cart";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = c => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} updateCount(); };
const money = n => "AED " + n.toFixed(2);

function updateCount() {
  const n = load().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll(".cart-link span").forEach(e => e.textContent = n);
}

// Add to cart
document.querySelectorAll(".product .btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const p = btn.closest(".product");
    const name = p.dataset.name, price = Number(p.dataset.price);
    const cart = load();
    const item = cart.find(i => i.name === name);
    item ? item.qty++ : cart.push({ name, price, qty: 1 });
    save(cart);
    btn.textContent = "Added";
    btn.classList.add("added");
    setTimeout(() => { btn.textContent = "Add to cart"; btn.classList.remove("added"); }, 1000);
  });
});

// Shop filters
document.querySelectorAll(".filters button").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".filters button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    const cat = b.dataset.cat;
    document.querySelectorAll(".product").forEach(p =>
      p.classList.toggle("hide", cat !== "all" && p.dataset.cat !== cat));
  });
});

// Cart page
const list = document.getElementById("cart-list");
if (list) {
  const render = () => {
    const cart = load();
    if (!cart.length) {
      list.innerHTML = '<p class="sub">Your cart is empty.</p><a class="btn" href="shop.html">Browse the shop</a>';
      return;
    }
    list.innerHTML = cart.map((i, idx) => `
      <div class="cart-row"><strong>${i.name}</strong>
      <div class="qty"><button data-a="dec" data-i="${idx}" aria-label="Decrease">−</button>${i.qty}<button data-a="inc" data-i="${idx}" aria-label="Increase">+</button></div>
      <span>${money(i.price * i.qty)}</span>
      <button class="remove" data-a="rm" data-i="${idx}">Remove</button></div>`).join("") +
      `<div class="total"><span>Total: ${money(cart.reduce((s, i) => s + i.price * i.qty, 0))}</span>
      <button class="btn" id="checkout">Checkout</button></div>`;
  };
  list.addEventListener("click", e => {
    const a = e.target.dataset.a; if (!a) return;
    const cart = load(), i = Number(e.target.dataset.i);
    if (a === "inc") cart[i].qty++;
    if (a === "dec") cart[i].qty = Math.max(1, cart[i].qty - 1);
    if (a === "rm") cart.splice(i, 1);
    save(cart); render();
  });
  list.addEventListener("click", e => {
    if (e.target.id === "checkout") { save([]); list.innerHTML = '<div class="notice">Thanks for your order! This is a demo, so no payment was taken.</div><a class="btn" href="shop.html">Keep shopping</a>'; }
  });
  render();
}

// Contact form
const form = document.getElementById("contact-form");
if (form) form.addEventListener("submit", e => {
  e.preventDefault();
  form.reset();
  document.getElementById("form-note").hidden = false;
});

updateCount();
