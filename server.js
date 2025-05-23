const express = require("express")
const bcrypt = require('bcryptjs');
var validator = require('validator');
const app = express()
const connect = require('./database/connection.js')
const cors = require('cors')
const datamodel = require("./userSchema.js")
const send = require('./sendEmail.js');
const config = require('./config/configuration.js')

app.use(cors());
app.use(express.json())
const hostname = config.SERVER.HOSTNAME;
const port = config.SERVER.PORT;

let accountnum = {};
const otpStore = {};

const OTP = () => {
  return Math.floor(1000 + Math.random() * 900000);
}
const AcountNO = () => {
  return Math.floor(1000 + Math.random() * 900000);
}

let otpgen = null;


app.get('/', (req, res) => {

  datamodel.find({})
    .then((data) => {
      return res.json(data)
    })
    .catch(() => {
      console.log('Data can not find');

    })
})

// Validation function
const validat = (objvalue) => {
  if (objvalue.Password !== objvalue.ConfirmPassword) {
    throw new Error('Password and Confirm Password should be the same');
  } else if (!validator.isEmail(objvalue.Email)) {
    throw new Error('Email is not valid');
  }
};
app.post('/datasave', async (req, res) => {
  const { otp, Email, Name, Password, ConfirmPassword, Age, Amount, AccType } = req.body;

  console.log('Received data:', req.body);

  const storedOtp = otpStore[Email.toLowerCase()];
  if (!storedOtp || otp != storedOtp) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'OTP is incorrect or expired' });
  }

  // Optional: delete OTP after use
  delete otpStore[Email.toLowerCase()];

  console.log(`Verified OTP for ${Email}: ${storedOtp}`);

  if (!Email || !Name || !Password || !ConfirmPassword || !Age || !Amount || !AccType) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'All fields are required' });
  }

  try {
    validat({ Email, Password, ConfirmPassword });
    console.log('Validation passed');

    const encryptedPassword = await bcrypt.hash(Password, 10);
    console.log('Encrypted Password:', encryptedPassword);

    const finalobj = new datamodel({
      Email,
      Name,
      Password: encryptedPassword,
      ConfirmPassword: encryptedPassword,
      Age,
      ACcountNO: accountnum,
      Amount,
      AccType,
    });

    await finalobj.save();
    console.log('Data saved successfully');

    res.status(config.StatusCode.SUCCCESS).json({
      message: 'Data saved successfully',
      accountNumber: accountnum,
    });
  } catch (err) {
    console.error('Detailed Error:', err.message);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to save data',
      error: err.message,
    });
  }
});



app.post('/emailsend', async (req, res) => {
  const { Email } = req.body;

  if (!Email) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "Email is required" });
  }

  try {
    const userinfo = await datamodel.findOne({ Email: Email.toLowerCase() });
    if (userinfo) {
      return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'Email already exists' });
    }

    // Generate OTP and Account Number
    const otp = OTP();
    otpStore[Email.toLowerCase()] = otp;
    const accountNumber = AcountNO();
    accountnum = accountNumber;

    console.log(`Generated OTP for ${Email}: ${otp}`);
    console.log(`Generated Account Number for ${Email}: ${accountNumber}`);

    const textVersion = `
Welcome to VS Bank!

Your OTP is: ${otp}
Your account number is: ${accountNumber}

Please do not share this with anyone.
`;

    const htmlVersion = `
<p>Welcome to <strong>VS Bank</strong>!</p>
<p>Your OTP is: <strong>${otp}</strong></p>
<p>Your account number is: <strong>${accountNumber}</strong></p>
<p style="color: gray; font-size: 0.9em;">Please do not share this with anyone.</p>
`;

    const emailResult = await send(Email, textVersion, htmlVersion);
    console.log(`Email sent to ${Email}:`, emailResult);

    if (!emailResult || emailResult.rejected?.length > 0) {
      return res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({
        message: "Failed to send email. Please try again.",
      });
    }

    res.status(config.StatusCode.SUCCCESS).json({
      message: 'OTP and account number sent successfully',
      otp, // returning correct OTP value
      accountNumber,
    });
  } catch (err) {
    console.error(err);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: "An error occurred" });
  }
});




app.post('/login', async (req, res) => {
  let { email, password } = req.body;
  console.log(req.body);

  try {

    console.log(email, 'email');
    let userinfo = await datamodel.findOne({ Email: email.toLowerCase() });

    console.log(userinfo, 'userinfo');

    if (!userinfo) {
      throw new Error('user is not present');
    }

    let passmatch = await bcrypt.compare(password, userinfo.Password);

    if (passmatch) {
      res.status(config.StatusCode.SUCCCESS).json({
        message: 'success',
        data: {
          name: userinfo.Name,
          age: userinfo.Age,
          accountNumber: userinfo.ACcountNO,
          accountType: userinfo.AccType,
          initialAmount: userinfo.Amount,
          email: userinfo.Email,
        }
      });
    } else {
      throw new Error('invalid Details');
    }
  } catch (err) {
    console.error(err);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
});


app.post('/deposit-otp', async (req, res) => {
  const { senderAccount } = req.body;

  if (!senderAccount) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "Sender account number is required" });
  }

  try {
    const cleanAccount = senderAccount.trim();
    // console.log(`Sender Account Number: ${cleanAccount}`);
    const sender = await datamodel.findOne({ ACcountNO: cleanAccount });
    //    console.log(`Sender Info: ${JSON.stringify(sender)}`);
    if (!sender) throw new Error("Sender not found");

    otpgen = OTP(); // Generate OTP
    console.log(`Generated OTP: ${otpgen}`);

    const emailContent = `
      Hello ${sender.Name},

      You requested to transfer money from your account (${senderAccount}).
      Please confirm this transaction with the OTP: ${otpgen}

      - VS Bank
    `;

    send(sender.Email, emailContent);

    return res.status(config.StatusCode.SUCCCESS).json({
      message: "OTP sent to sender's email"
    });
  } catch (err) {
    console.error("Error sending OTP:", err.message);
    return res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
});

app.post('/deposit', async (req, res) => {
  const { senderAccount, recipientAccount, amount, otp } = req.body;

  if (!senderAccount || !recipientAccount || !amount || !otp) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "All fields required" });
  }
  const cleanAmount = Number(amount);
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "Amount must be a valid number greater than 0" });
  }

  try {
    const sender = await datamodel.findOne({ ACcountNO: senderAccount });
    if (!sender) throw new Error("Sender not found");

    const receiver = await datamodel.findOne({ ACcountNO: recipientAccount });
    if (!receiver) throw new Error("Recipient not found");

    if (!otp) {
      return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'OTP is required' });
    }

    console.log(`Generated OTP: ${otpgen}, Received OTP: ${otp}`);

    if (otp != otpgen) {
      return res.status(config.StatusCode.BAD_REQUEST).json({ message: 'OTP is incorrect' });
    }

    const senderBalance = Number(sender.Amount);
    if (senderBalance < cleanAmount) {
      throw new Error("Insufficient funds");
    }


    sender.Amount = senderBalance - cleanAmount;
    receiver.Amount = Number(receiver.Amount) + cleanAmount;


    await sender.save();
    await receiver.save();

    const emailContent = `
      Hello ${receiver.Name},

      You've received ₹${amount} from ${sender.Name}.
      Your updated balance is ₹${receiver.Amount}.

      Thanks,
      VS Bank
    `;
    send(receiver.Email, emailContent);

    return res.status(config.StatusCode.SUCCCESS).json({
      message: `₹${amount} transferred successfully`,
      newSenderBalance: sender.Amount
    });

  } catch (err) {
    console.error("Transfer Error:", err.message);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
});

app.post('/withdraw', async (req, res) => {
  const { accountNumber, amount } = req.body;

  if (!accountNumber || !amount) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "Account number and amount are required" });
  }

  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(config.StatusCode.BAD_REQUEST).json({ message: "Amount must be a valid number greater than 0" });
  }

  try {
    const user = await datamodel.findOne({ ACcountNO: accountNumber.trim() });

    if (!user) {
      throw new Error("Account not found");
    }

    const currentBalance = Number(user.Amount);
    if (currentBalance < withdrawAmount) {
      throw new Error("Insufficient balance");
    }

    // Deduct the amount
    user.Amount = currentBalance - withdrawAmount;
    await user.save();

    // Send confirmation email
    const emailContent = `
      Hello ${user.Name},

      ₹${withdrawAmount} has been debited from your account (${accountNumber}).
      Your updated balance is ₹${user.Amount}.

      Thank you for banking with us!

      - VS Bank Team
    `;

    send(user.Email, emailContent);

    return res.status(config.StatusCode.SUCCCESS).json({
      message: `₹${withdrawAmount} withdrawn successfully`,
      remainingBalance: user.Amount
    });

  } catch (err) {
    console.error("Withdraw Error:", err.message);
    res.status(config.StatusCode.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
});




connect()

app.listen(port, '0.0.0.0', hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
