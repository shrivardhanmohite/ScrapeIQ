export default function AgentSteps({ steps }){

  if(!steps) return null;

  return(

    <div>

      <h3>Agent Steps</h3>

      <ul>

        {steps.map((step,i)=>(
          <li key={i}>{step}</li>
        ))}

      </ul>

    </div>

  );

}