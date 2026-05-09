import { useState } from "react";
import SearchBox from "../components/SearchBox";
import Result from "../components/Result";

export default function Home() {

  const [result, setResult] = useState("");

  return (
    <div style={{padding:"40px"}}>
      <h1>AI Web Scraping Agent</h1>

      <SearchBox setResult={setResult}/>

      <Result result={result}/>
    </div>
  );
}