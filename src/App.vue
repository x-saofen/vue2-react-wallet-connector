<template>
  <div id="app">
    <el-row class="nav">
        <div v-if="account == null">
          <el-button round  @click="walletConnectDialog = true" style="background-color: lightskyblue; margin-top: 19px; float: right; margin-right: 30px;" >Connect to wallet</el-button>
        </div>
        <div v-else class="account-info">
          <div class="account">
            <el-tag type="success">{{currentConnect}}</el-tag>
            {{account}}
          </div>
        </div>
    </el-row>

    <el-row>

      <el-empty  v-if="account == null" style="margin-top: 30px"></el-empty>

      <el-col v-else >
        <el-form ref="transferForm" :model="transferForm" :rules="transferFormRules" label-width="180px">
          <el-form-item label="Contract" prop="contract">
            <el-input v-model="transferForm.contract"></el-input>
          </el-form-item>
          <el-form-item label="Decimals" prop="decimals">
            <el-input-number v-model="transferForm.decimals"  :min="6" :max="18" ></el-input-number>
          </el-form-item>
          <el-form-item label="Recipient address" prop="to">
            <el-input v-model="transferForm.to"></el-input>
          </el-form-item>
          <el-form-item label="Amount" prop="amount">
            <el-input-number v-model="transferForm.amount" :min="0.000000000000000001"  ></el-input-number>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onSubmit">Submit</el-button>
          </el-form-item>
        </el-form>

      </el-col>
    </el-row>

    <el-dialog
        title="Connect to wallet"
        :visible.sync="walletConnectDialog"
        :width="walletConnectDialogWidth"
        >
        <div class="wallet-connect">
          <div class="wallet-connect-item" v-if="pc && metaMaskInstalled" @click="openMetaMask">
            <div style="float: left; padding-left: 30px">
              Metamask
            </div>
            <div style="float: right">
              <img src="@/assets/icon/metamask.jpg" style="height: 40px; padding-right: 30px">
            </div>
          </div>
          <div class="wallet-connect-item" @click="openWalletConnect">
            <div style="float: left; padding-left: 30px">
              Walletconnect
            </div>
            <div style="float: right">
              <img src="@/assets/icon/walletconnect.jpg" style="height: 40px; padding-right: 30px">
            </div>
          </div>

        </div>
    </el-dialog>

    <el-dialog
        title="Transaction Hash"
        :visible.sync="txHashDialog"
        :width="walletConnectDialogWidth"
    >
      <div style="text-align: center; margin: 30px 0">
        <el-link type="primary" :href="network.browser+'/tx/'+txHash" target="_blank">{{txHash}}</el-link>
      </div>

    </el-dialog>

    <el-dialog
        title="Waiting for response"
        :visible.sync="waitDialog"
        :width="walletConnectDialogWidth"
    >
      <el-row style="width: 100%; height: 400px" v-loading="true"  element-loading-background="rgba(0, 0, 0, 0.06)">

      </el-row>

    </el-dialog>

  </div>

</template>

<script>
import device from 'current-device';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "@walletconnect/qrcode-modal";
const ethereum = window.ethereum;
import VConsole from 'vconsole';
const vConsole = new VConsole();

/**
 * @see  MetaMask  https://docs.metamask.io/guide/
 * @see  WalletConnect https://docs.walletconnect.com/
 */
export default {
  name: 'App',
  data(){
    return {
      pc: device.desktop(),
      account: null,
      metaMaskInstalled: false,
      walletConnectDialog: false,
      txHashDialog: false,
      txHash: '',
      waitDialog: false,
      walletConnectDialogWidth: device.desktop() ? '40%' : '100%',
      currentConnect: undefined,
      walletConnect: undefined,
      Web3j: undefined,
      connectType: {
        metamask: 'Metamask',
        walletconnect: 'Walletconnect'
      },
      network:{
        // 币安测试链
        chainId: 97,
        chainName: 'Binance Smart Chain Testnet',
        browser: 'https://testnet.bscscan.com',
        node: 'https://data-seed-prebsc-2-s3.binance.org:8545/',
        gasLimit: '',
      },
      transferForm: {
        contract: '0x46D973fAf475114b6D52C3E3769a6738F467c05f',
        decimals: 18,
        to: '',
        amount: undefined,
      },
      transferFormRules: {
        contract: [
          { required: true, message: 'Please enter the contract address', trigger: 'blur' },
        ],
        decimals: [
          { required: true, message: 'Please enter the contract decimals', trigger: 'blur' }
        ],
        to: [
          { required: true, message: 'Please enter the recipient address', trigger: 'blur' }
        ],
        amount: [
          { required: true, message: 'Please enter the amount', trigger: 'blur' }
        ],

      }
    }
  },
  created() {
    //this.Web3j = new Web3(new Web3.providers.HttpProvider(this.network.node));
    if(this.pc){
      // 判断是否安装metamask
      if (typeof window.ethereum !== 'undefined') {
        this.metaMaskInstalled = true;
      }
    }
  },
  methods: {
    //
    async openMetaMask(){
      let result = await ethereum.request({ method: 'eth_requestAccounts' })
      .catch(
          err => {
            this.$message({
              message: err.message,
              type: 'error'
            });
          }
      )
      this.account = result[0];
      this.currentConnect = this.connectType.metamask;
      this.walletConnectDialog = false;
    },
    //
    async openWalletConnect(){
      this.currentConnect = this.connectType.walletconnect;
      // Create a connector
      this.connector = await new WalletConnect({
        bridge: "https://bridge.walletconnect.org", // Required
        qrcodeModal: QRCodeModal,
      });
      // Check if connection is already established
      if (!this.connector.connected) {
        // create new session
        await this.connector.createSession();
      }else {
        console.log(this.connector);
        if(!await this.checkChainId()){
          await this.connector.killSession(onerror => {
            console.log(onerror);
          })
        }else {
          this.account = this.connector.accounts[0];
          this.walletConnectDialog = false;
        }
      }

      this.connector.on("connect", (error, payload) => {
        if (error) {
          throw error;
        }
        if(this.checkChainId()){
          this.account = payload.params[0].accounts[0];
          this.walletConnectDialog = false;
        }
      });

      // Subscribe to accounts change
      this.connector.on("accountsChanged", (accounts) => {
        console.log(accounts);
      });

      // Subscribe to chainId change
      this.connector.on("chainChanged", (chainId) => {
        console.log(chainId);
      });

      this.connector.on("disconnect", (error, payload) => {
        if (error) {
          throw error;
        }
        console.log(payload);
        // Delete connector

      });

    },
    // 校验链ID
    async checkChainId(){
      let checkSuccess = false;
      if(this.currentConnect === this.connectType.walletconnect){
        checkSuccess = this.connector.chainId === this.network.chainId;
      }else {
        checkSuccess = Number.parseInt(window.ethereum.chainId) === this.network.chainId;
      }
      if(!checkSuccess){
        this.$message({
          message: 'Please switch to' + this.network.chainName,
          type: 'warning'
        });
      }
      return checkSuccess;
    },

    async onSubmit(){
      await this.$refs['transferForm'].validate((valid) => {
        if (valid) {
          if(!this.checkChainId() ){
            return;
          }
          // 校验地址
          if(!this.Web3.utils.isAddress(this.transferForm.contract, this.network.chainId)){
            this.$message({
              message: 'Please enter the correct contract address',
              type: 'error'
            });
            return ;
          }
          if(!this.Web3.utils.isAddress(this.transferForm.to, this.network.chainId)){
            this.$message({
              message: 'Please enter the correct recipient address',
              type: 'error'
            });
            return ;
          }

          if(this.currentConnect === this.connectType.walletconnect){
            this.submitWalletConnectTx();
          }else {
            this.submitMetaMaskTx();
          }
        } else {
          return false;
        }
      });
    },

    async submitMetaMaskTx(){
      const transactionParameters = {
        to: this.transferForm.contract, // Required except during contract publications.
        from: this.account, // must match user's active address.
        value: '0x00', // Only required to send ether to the recipient from the initiating external account.
        data: this.buildSignatureData(), // Optional, but used for defining smart contract creation and interaction.
        chainId: '0x'+this.network.chainId.toString(16),
      };
       await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      }).then((txHash) => {
          this.txHash = txHash;
          this.txHashDialog = true;
      })
      .catch((error) => {
        console.log(error)
        this.$message({
          message: error.message,
          type: 'error'
        });
      });
    },

    async submitWalletConnectTx(){
      this.waitDialog = true;
      const tx = {
        from: this.account, // Required
        to: this.transferForm.contract, // Required (for non contract deployments)
        data: this.buildSignatureData(), // Required
        value: "0x00", // Optional
      };
      console.log(tx.data);
      await this.connector
          .sendTransaction(tx)
          .then((result) => {
            // Returns transaction id (hash)
            this.waitDialog = false;
            this.txHash = result;
            this.txHashDialog = true;
          })
          .catch((error) => {
            // Error returned when rejected
            console.error(error);
            this.$message({
              message: error.message,
              type: 'error'
            });
            this.waitDialog = false;
          });

    },

    getWeb3Unit(){
      let unitValue = Math.pow(10, this.transferForm.decimals) + '';
      let unitKeys = Object.keys(this.Web3.utils.unitMap);
      for (let unit of unitKeys) {
        if(this.Web3.utils.unitMap[unit] == unitValue){
          return unit;
        }
      }
      this.$message({
        message: 'Current precision is not supported',
        type: 'error'
      });
    },
    // 构建签名数据
    buildSignatureData(){
      // Transfer MethodID: 0xa9059cbb
      let amountValue = this.Web3.utils.toWei(this.transferForm.amount+'', this.getWeb3Unit());
      console.log(this.Web3.utils.toHex(amountValue));
      console.log(this.transferForm.to.substr(2));
      return  "0xa9059cbb" + this.addPreZero(this.transferForm.to.substr(2)) +  this.addPreZero(this.Web3.utils.toHex(amountValue).substr(2));
    },
    addPreZero(num){
      let t = (num+'').length,
          s = '';
      for(let i=0; i<64-t; i++){
        s += '0';
      }
      return s+num;
    }

  },



}
</script>

<style>
*{
  padding: 0;
  margin: 0;
}
a {
  text-decoration: none;
}
.nav {
  height: 80px;
  width: 100%;
  box-shadow: 0px 15px 10px -15px #0f0f0f;
}

.account-info {
  float: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 80px;
}
.account-info div {
  display: inline-block;

}
.account {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 30px;

}
.wallet-connect {
  margin: 0 10px;
  padding-bottom: 30px;
}
.wallet-connect-item {
  height: 60px;
  margin-bottom: 15px;
  line-height: 60px;
  font-weight: 900;
  border-radius: 10px;
  border: 1px solid #0f0f0f36;
  cursor:pointer;
}
.wallet-connect-item img {
  vertical-align: middle;
}

.wallet-connect-item:hover {
  border: 1px solid lightskyblue;
}
</style>
