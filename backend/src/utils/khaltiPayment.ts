import axios from "axios";

interface KhaltiPayloadCustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface KhaltiPayloadProductDetail {
  identity: string;
  name: string;
  total_price: number;
  quantity: number;
  unit_price: number;
}

interface KhaltiPayloadAmountBreakdown {
  label: string;
  amount: number;
}

export interface KhaltiPayload {
  amount: number;
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info: KhaltiPayloadCustomerInfo;
  product_details: KhaltiPayloadProductDetail[];
  amount_breakdown: KhaltiPayloadAmountBreakdown[];
  return_url: string;
  website_url: string;
}

export async function initializeKhaltiPayment(
  details: KhaltiPayload
): Promise<any> {
  const headersList = {
    Authorization: `Key ${process.env.KHALTI_LIVE_TEST_KEY}`,
    "Content-Type": "application/json",
  };

  const reqOptions = {
    url: "https://a.khalti.com/api/v2/epayment/initiate/",
    method: "post",
    headers: headersList,
    data: details,
  };

  try {
    const response = await axios.request(reqOptions);
    return response.data;
  } catch (error) {
    console.error("Error initializing Khalti payment:", error);
    throw error;
  }
}

export async function verifyKhaltiPayment(pidx: string): Promise<any> {
  const headersList = {
    Authorization: `Key ${process.env.KHALTI_LIVE_TEST_KEY}`,
    "Content-Type": "application/json",
  };

  const bodyContent = JSON.stringify({ pidx });

  const reqOptions = {
    url: `https://a.khalti.com/api/v2/epayment/lookup/`,
    method: "POST",
    headers: headersList,
    data: bodyContent,
  };

  try {
    const response = await axios.request(reqOptions);
    return response.data;
  } catch (error) {
    console.error("Error verifying Khalti payment:", error);
    throw error;
  }
}
