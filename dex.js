
Moralis.start({ serverUrl: 'https://sps5saxmfckn.usemoralis.com:2053/server', appId: 'lLO0Rp9PcAWadlqUoRhYKJvdO4amL773oRrkx5wo' });

Moralis
    .initPlugins()
    .then(() => console.log("Plugins have been initialized"));

const $tokenBalancesTBody = document.querySelector(".js-token-balances");
const $selectedToken = document.querySelector('.js-from-token')
const $amountInput = document.querySelector('.js-from-amount');

//** Utilities */
//Converting from Wei using custom Function
const tokenValue = (value, decimals) => 
    (decimals ? value / Math.pow(10, decimals) : value);

//** Login-Logout and initialization */
// add from here down
async function login() {
    let user = Moralis.User.current();
    if (!user) {
        user = await Moralis.authenticate();
    }
    console.log("logged in user:", user);
    getStats();
  }

  async function initSwapForm(event){
      event.preventDefault();
      $selectedToken.innerText = event.target.dataset.symbol;
      $selectedToken.dataset.address = event.target.dataset.address;
      $selectedToken.dataset.decimals = event.target.dataset.decimals;
      $selectedToken.dataset.max = event.target.dataset.max;
      $amountInput.removeAttribute('disabled');
      $amountInput.value = '';
      document.querySelector('.js-submit').removeAttribute('disabled');
      document.querySelector('.js-cancel').removeAttribute('disabled');
      document.querySelector('.js-quote-container').innerHTML = '';
      document.querySelector('.js-amount-error').innerText = '';
      
  }

  async function getStats () {
    const balances = await Moralis.Web3API.account.getTokenBalances({chain: "polygon"});
    console.log(balances);
    $tokenBalancesTBody.innerHTML = balances.map( (token, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${token.symbol}</td>
            <td>${tokenValue(token.balance, token.decimals)}</td>
            <td> 
              <button
                  class="js-swap btn btn-success"
                  data-address="${token.token_address}"
                  data-symbol="${token.symbol}"
                  data-decimals="${token.decimals}"
                  data-max="${tokenValue(token.balance, token.decimals)}"
              
              >
                  Swap
              </button>
            </td>
        </tr>
    `).join('');
    for (let $btn of $tokenBalancesTBody.querySelectorAll('.js-swap')){
      $btn.addEventListener('click', initSwapForm);
    }
  }



  async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
  }

  async function buyCrypto(){
    Moralis.Plugins.fiat.buy();
  }

  document.querySelector("#btn-login").addEventListener('click', login);
  document
    .getElementById("btn-buy-crypto")
    .addEventListener('click', buyCrypto);
  document.getElementById("btn-logout").addEventListener('click', logOut);

  //** Quote / Swap */

  async function formSubmitted(event) {
      event.preventDefault();
      const fromAmount = Number.parseFloat( $amountInput.value);
      const fromMaxValue = Number.parseFloat( $selectedToken.dataset.max);
      debugger;
      if ( Number.isNaN(fromAmount) || fromAmount > fromMaxValue) {
          document.querySelector('.js-amount-error').innerText = 'Invalid amount';
          return;
      } else {
          document.querySelector('.js-amount-error').innerText = '';
      }

      
      const fromDecimals = $selectedToken.dataset.decimals;
      const fromTokenAddress = $selectedToken.dataset.address;

      const [toTokenAddress, toDecimals] = document.querySelector('[name=to-token]').value.split('-');

      try {
          const quote = await Moralis.Plugins.oneInch.quote({
              chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
              fromTokenAddress, // The token you want to swap
              toTokenAddress, // The token you want to receive
              amount: Moralis.Units.Token(fromAmount, fromDecimals).toString(),
          }); 
          
          const toAmount = tokenValue(toTokenAmount, toDecimals);
          document.querySelector('.js-quote-container').innerHTML = `
                <p>
                    ${fromAmount} ${quote.fromToken.symbol} = 
                    ${toAmount} ${quote.toToken.symbol}
                </p>
                <p>
                    Gas fee: ${quote.estimatedGas}
                </p>
          `;

      } catch(e) {
          document.querySelector('.js-quote-container').innerHTML = `
          <p class = "error">The conversion didn't succed.</p>
          `;
      }
  }
  async function formCanceled (event) {
      event.preventDefault();
      document.querySelector('.js-submit').setAttribute('disabled', '');
      document.querySelector('.js-cancel').setAttribute('disabled', '');
      $amountInput.value = '';
      $amountInput.setAttribute('disabled', '');
      delete $selectedToken.dataset.address;
      delete $selectedToken.dataset.decimals;
      delete $selectedToken.dataset.max;
      document.querySelector('.js-quote-container').innerHTML = '';
      document.querySelector('.js-amount-error').innerText = '';
  }

  document.querySelector('.js-submit').addEventListener('click', formSubmitted);
  document.querySelector('.js-cancel').addEventListener('click', formCanceled);


  //** To token dropdown preparation */
async function getTop10Tokens() {
    const response = await fetch('https://api.coinpaprika.com/v1/coins');
    const tokens = await response.json();

    return tokens
                .filter(token => token.rank >= 1 && token.rank <=100)
                .map(token => token.symbol);
}
async function getTickerData(tickerList) {
    const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
    });
    const tokenList = Object.values(tokens.tokens);

    return tokenList.filter(token => tickerList.includes(token.symbol));
}

function renderTokenDropDown (tokens) {
    const options = tokens.map(token => 
      `<option value="${token.address}-${token.decimals}">
          ${token.name}
      </option>
      `).join('');
      document.querySelector('[name=to-token]').innerHTML = options;
}

getTop10Tokens ()
    .then(getTickerData)
    .then(renderTokenDropDown);