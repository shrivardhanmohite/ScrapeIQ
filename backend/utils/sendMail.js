const sendMail = async () => {

  if (!result?.result?.data?.length) {

    alert("No dataset available.");

    return;
  }

  const email = window.prompt(
    "Enter recipient email"
  );

  if (!email || !email.trim()) {

    return;
  }

  try {

    const response = await axios.post(
      "http://localhost:5000/api/send-mail",
      {
        email,
        data: result.result.data
      }
    );

    alert(
      response.data.message ||
      "Dataset mailed successfully."
    );

  } catch (err) {

    console.error(err);

    alert(
      err?.response?.data?.message ||
      "Failed to send mail."
    );
  }
};